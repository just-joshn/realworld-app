import { http, HttpResponse } from "msw";
import { expect, onTestFinished, test, vi } from "vitest";
import { interpret } from "xstate";
import { authMachine } from "../machines/authMachine";
import { snackbarMachine } from "../machines/snackbarMachine";
import { buildUser } from "../../test/factories";
import { apiUrl, worker } from "../../test/browser/msw";
import { history, renderWithRouter } from "../../test/browser/render";
import TransactionCreateContainer from "./TransactionCreateContainer";

const receiver = buildUser({
  id: "user2",
  firstName: "Grace",
  lastName: "Hopper",
  username: "grace",
});

async function renderCreate({ signedIn = true } = {}) {
  worker.use(
    http.post(apiUrl("/login"), () => HttpResponse.json({ user: buildUser() })),
    http.get(apiUrl("/users"), () => HttpResponse.json({ results: [receiver] })),
    http.post(apiUrl("/transactions"), () => HttpResponse.json({ transaction: { id: "new" } })),
    http.get(apiUrl("/checkAuth"), () => HttpResponse.json({ user: buildUser() }))
  );
  const authService = interpret(authMachine).start();
  const snackbarService = interpret(snackbarMachine).start();
  onTestFinished(() => {
    authService.stop();
    snackbarService.stop();
  });
  if (signedIn) {
    await new Promise<void>((resolve) => {
      const subscription = authService.subscribe((state) => {
        if (state.matches("authorized")) {
          subscription.unsubscribe();
          resolve();
        }
      });
      authService.send("LOGIN");
    });
  }
  return renderWithRouter(
    <TransactionCreateContainer authService={authService} snackbarService={snackbarService} />,
    { route: "/transaction/new" }
  );
}

test("searches contacts and selects a recipient", async () => {
  worker.use(
    http.get(apiUrl("/users/search"), ({ request }) =>
      HttpResponse.json({
        results: new URL(request.url).searchParams.get("q") === "missing" ? [] : [receiver],
      })
    )
  );
  const screen = await renderCreate();
  await expect.element(screen.getByText("Grace Hopper")).toBeVisible();
  await screen.getByPlaceholder("Search...").fill("missing");
  await expect.element(screen.getByText("Grace Hopper")).not.toBeInTheDocument();
  await screen.getByPlaceholder("Search...").fill("Grace");
  await screen.getByText("Grace Hopper").click();
  await expect.element(screen.getByRole("heading", { name: "Grace Hopper" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Pay" })).toBeDisabled();
});

test("does not advance a signed-out visitor after selecting a contact", async () => {
  const screen = await renderCreate({ signedIn: false });
  await screen.getByText("Grace Hopper").click();
  await expect.element(screen.getByPlaceholder("Search...")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Pay" })).not.toBeInTheDocument();
});

test("explains required payment fields before enabling submission", async () => {
  const screen = await renderCreate();
  await screen.getByText("Grace Hopper").click();
  await screen.getByPlaceholder("Add a note").click();
  await expect.element(screen.getByText("Please enter a valid amount")).toBeVisible();
  await screen.getByPlaceholder("Amount").fill("12.50");
  await expect.element(screen.getByText("Please enter a note")).toBeVisible();
  await screen.getByPlaceholder("Add a note").fill("Lunch");
  await expect.element(screen.getByRole("button", { name: "Pay" })).toBeEnabled();
  await screen.getByPlaceholder("Add a note").clear();
  await expect.element(screen.getByRole("button", { name: "Request" })).toBeDisabled();
});

for (const [action, summary] of [
  ["Pay", "Paid"],
  ["Request", "Requested"],
] as const) {
  test(`confirms a ${action.toLowerCase()} transaction and returns to transactions`, async () => {
    const screen = await renderCreate();
    const received = vi.fn();
    worker.use(
      http.post(apiUrl("/transactions"), async ({ request }) => {
        received(await request.json());
        return HttpResponse.json({ transaction: { id: "new" } });
      })
    );
    await screen.getByText("Grace Hopper").click();
    await screen.getByPlaceholder("Amount").fill("12.50");
    await screen.getByPlaceholder("Add a note").fill("Lunch");
    await screen.getByRole("button", { name: action }).click();
    await expect
      .element(screen.getByRole("heading", { name: `${summary} $12.50 for Lunch` }))
      .toBeVisible();
    await expect.poll(() => received.mock.calls.length).toBe(1);
    expect(received).toHaveBeenCalledWith({
      transactionType: action === "Pay" ? "payment" : "request",
      amount: "12.50",
      description: "Lunch",
      senderId: "user1",
      receiverId: "user2",
    });
    await screen.getByRole("link", { name: "Return To Transactions" }).click();
    await expect.poll(() => history.location.pathname).toBe("/");
  });
}

test("starts a fresh transaction after completing one", async () => {
  const screen = await renderCreate();
  await screen.getByText("Grace Hopper").click();
  await screen.getByPlaceholder("Amount").fill("0");
  await screen.getByPlaceholder("Add a note").fill("Free lunch");
  await screen.getByRole("button", { name: "Request" }).click();
  await expect
    .element(screen.getByRole("heading", { name: "Requested $0.00 for Free lunch" }))
    .toBeVisible();
  await screen.getByRole("button", { name: "Create Another Transaction" }).click();
  await expect.element(screen.getByPlaceholder("Search...")).toBeVisible();
  await expect.poll(() => history.location.pathname).toBe("/transaction/new");
});
