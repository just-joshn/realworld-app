import { expect, test } from "vitest";
import { buildTransactionResponseItem, buildLike, buildComment } from "../../test/factories";
import { history, renderWithRouter } from "../../test/browser/render";
import TransactionItem from "./TransactionItem";
import { TransactionRequestStatus } from "../models";

for (const [requestStatus, action, amount] of [
  [undefined, "paid", "-$25.00"],
  [TransactionRequestStatus.pending, "requested", "+$25.00"],
  [TransactionRequestStatus.accepted, "charged", "+$25.00"],
] as const) {
  test(`shows who ${action} whom and the signed amount`, async () => {
    const screen = await renderWithRouter(
      <TransactionItem
        transaction={buildTransactionResponseItem({
          ...(requestStatus ? { requestStatus } : {}),
          likes: [buildLike()],
          comments: [buildComment(), buildComment({ id: "comment2" })],
        })}
      />
    );
    await expect.element(screen.getByText(`Ada Lovelace ${action} Grace Hopper`)).toBeVisible();
    await expect.element(screen.getByText(amount)).toBeVisible();
    await expect.element(screen.getByText("1", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("2", { exact: true })).toBeVisible();
    await screen.getByText("Lunch").click();
    await expect.poll(() => history.location.pathname).toBe("/transaction/txn1");
  });
}

test("shows a zero payment without inventing a monetary value", async () => {
  const screen = await renderWithRouter(
    <TransactionItem transaction={buildTransactionResponseItem({ amount: 0 })} />
  );
  await expect.element(screen.getByText("-0", { exact: true })).toBeVisible();
});
