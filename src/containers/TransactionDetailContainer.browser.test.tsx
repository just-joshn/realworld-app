import { http, HttpResponse } from "msw";
import { Route } from "react-router-dom";
import { expect, onTestFinished, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { interpret } from "xstate";
import { authMachine } from "../machines/authMachine";
import { TransactionRequestStatus, TransactionResponseItem } from "../models";
import {
  buildComment,
  buildLike,
  buildTransactionResponseItem,
  buildUser,
} from "../../test/factories";
import { apiUrl, worker } from "../../test/browser/msw";
import { renderWithRouter } from "../../test/browser/render";
import TransactionDetailContainer from "./TransactionDetailContainer";

async function renderDetail(transaction: TransactionResponseItem, user = buildUser()) {
  worker.use(
    http.post(apiUrl("/login"), () => HttpResponse.json({ user })),
    http.get(apiUrl("/transactions/txn1"), () => HttpResponse.json({ transaction }))
  );
  const authService = interpret(authMachine).start();
  onTestFinished(() => {
    authService.stop();
  });
  await new Promise<void>((resolve) => {
    const subscription = authService.subscribe((state) => {
      if (state.matches("authorized")) {
        subscription.unsubscribe();
        resolve();
      }
    });
    authService.send("LOGIN");
  });
  return renderWithRouter(
    <Route path="/transaction/:transactionId">
      <TransactionDetailContainer authService={authService} />
    </Route>,
    { route: "/transaction/txn1" }
  );
}

test("shows payment details without an empty comments section", async () => {
  const screen = await renderDetail(buildTransactionResponseItem());
  await expect.element(screen.getByRole("heading", { name: "Transaction Detail" })).toBeVisible();
  await expect.element(screen.getByText("Lunch")).toBeVisible();
  await expect.element(screen.getByText("-$25.00")).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Comments" })).not.toBeInTheDocument();
  await expect
    .element(screen.getByRole("button", { name: "Accept Request" }))
    .not.toBeInTheDocument();
});

test("likes a transaction and prevents liking it again", async () => {
  const transaction = buildTransactionResponseItem();
  const received = vi.fn();
  worker.use(
    http.post(apiUrl("/likes/txn1"), async ({ request }) => {
      received(await request.json());
      transaction.likes = [buildLike({ userId: "user1" })];
      return HttpResponse.json({});
    })
  );
  const screen = await renderDetail(transaction);
  // The thumb-up icon is the only icon-only button; the app gives it no accessible name.
  await screen.getByRole("button", { name: "", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "", exact: true })).toBeDisabled();
  expect(received).toHaveBeenCalledExactlyOnceWith({ transactionId: "txn1" });
});

test("adds a comment with Enter and shows the saved comment", async () => {
  const transaction = buildTransactionResponseItem();
  const received = vi.fn();
  worker.use(
    http.post(apiUrl("/comments/txn1"), async ({ request }) => {
      const payload = (await request.json()) as { content: string };
      received(payload);
      transaction.comments = [buildComment({ content: payload.content })];
      return HttpResponse.json({});
    })
  );
  const screen = await renderDetail(transaction);
  await screen.getByPlaceholder("Write a comment...").fill("Thanks for lunch!");
  await userEvent.tab();
  await screen.getByPlaceholder("Write a comment...").click();
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByRole("heading", { name: "Comments" })).toBeVisible();
  await expect.element(screen.getByText("Thanks for lunch!")).toBeVisible();
  expect(received).toHaveBeenCalledExactlyOnceWith({
    transactionId: "txn1",
    content: "Thanks for lunch!",
  });
});

for (const [action, status] of [
  ["Accept", TransactionRequestStatus.accepted],
  ["Reject", TransactionRequestStatus.rejected],
] as const) {
  test(`${action.toLowerCase()}s a pending money request`, async () => {
    const transaction = buildTransactionResponseItem({
      requestStatus: TransactionRequestStatus.pending,
    });
    const received = vi.fn();
    worker.use(
      http.patch(apiUrl("/transactions/txn1"), async ({ request }) => {
        received(await request.json());
        transaction.requestStatus = status;
        return HttpResponse.json({});
      })
    );
    const screen = await renderDetail(transaction, buildUser({ id: "user2" }));
    await screen.getByRole("button", { name: `${action} Request` }).click();
    await expect.element(screen.getByRole("heading", { name: "Transaction Detail" })).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Accept Request" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Reject Request" }))
      .not.toBeInTheDocument();
    expect(received).toHaveBeenCalledExactlyOnceWith({ id: "txn1", requestStatus: status });
  });
}

test("does not offer request actions to someone other than the recipient", async () => {
  const screen = await renderDetail(
    buildTransactionResponseItem({ requestStatus: TransactionRequestStatus.pending })
  );
  await expect.element(screen.getByRole("heading", { name: "Transaction Detail" })).toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Accept Request" }))
    .not.toBeInTheDocument();
});
