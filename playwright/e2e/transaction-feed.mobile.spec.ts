import { test, expect } from "../fixtures/auth";
import { createTransaction } from "../helpers/api";
import { FUTURE, pickDateRange, raiseMinimumAmount } from "../helpers/feed";

test.describe("transaction feed on a phone", { tag: ["@e2e", "@transactions"] }, () => {
  test("a user filters by date in a full-screen picker", async ({ page }) => {
    await page.clock.install({ time: FUTURE });
    await page.goto("/");
    await expect(page.getByRole("listitem").first()).toBeVisible();

    await pickDateRange(page, new Date("2030-01-01"), new Date("2030-01-10"));

    await expect(page.getByRole("heading", { name: "No Transactions" })).toBeVisible();
    const dateChip = page.getByRole("button", { name: "Date: Jan, 1 2030 - Jan, 10 2030" });
    await dateChip.click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await dateChip.focus();
    await page.keyboard.press("Delete");

    await expect(page.getByRole("button", { name: "Date: ALL" })).toBeVisible();
    await expect(page.getByRole("listitem").first()).toBeVisible();
  });

  test("a user narrows the feed by amount", async ({ page, userApi, createUser }) => {
    const payee = await createUser();
    const small = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: payee.id,
      amount: 5,
      description: "Small",
    });
    const large = await createTransaction(userApi, {
      transactionType: "payment",
      receiverId: payee.id,
      amount: 50,
      description: "Large",
    });
    await page.goto("/personal");
    await expect(page.getByTestId(`transaction-item-${small.id}`)).toBeVisible();

    await raiseMinimumAmount(page);

    await expect(page.getByText("Amount Range: $10 - $1,000")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByTestId(`transaction-item-${large.id}`)).toBeVisible();
    await expect(page.getByTestId(`transaction-item-${small.id}`)).toHaveCount(0);

    await page.getByRole("button", { name: "Amount: $10 - $1,000" }).click();
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    await expect(page.getByRole("button", { name: "Amount: $0 - $1,000" })).toBeVisible();
    await expect(page.getByTestId(`transaction-item-${small.id}`)).toBeVisible();
  });
});
