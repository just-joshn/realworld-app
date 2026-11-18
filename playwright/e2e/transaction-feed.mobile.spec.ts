import { test, expect } from "../fixtures/auth";
import { createTransaction } from "../helpers/api";
import { FUTURE } from "../pages/transaction-feed.page";

test.describe("transaction feed on a phone", { tag: ["@e2e", "@transactions"] }, () => {
  test("a user filters by date in a full-screen picker", async ({
    page,
    transactionFeedPage: feed,
  }) => {
    await page.clock.install({ time: FUTURE });
    await feed.goto();
    await expect(feed.transactions.first()).toBeVisible();

    await feed.pickDateRange(new Date("2030-01-01"), new Date("2030-01-10"));

    await expect(feed.emptyHeading).toBeVisible();
    const dateChip = feed.dateFilter("Jan, 1 2030 - Jan, 10 2030");
    await dateChip.click();
    await feed.closeButton.click();
    await dateChip.focus();
    await page.keyboard.press("Delete");

    await expect(feed.dateFilter("ALL")).toBeVisible();
    await expect(feed.transactions.first()).toBeVisible();
  });

  test("a user narrows the feed by amount", async ({
    page,
    transactionFeedPage: feed,
    userApi,
    createUser,
  }) => {
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
    await feed.goto("mine");
    await expect(feed.transaction(small.id)).toBeVisible();

    await feed.raiseMinimumAmount();

    await expect(page.getByText("Amount Range: $10 - $1,000")).toBeVisible();
    await feed.closeButton.click();
    await expect(feed.transaction(large.id)).toBeVisible();
    await expect(feed.transaction(small.id)).toHaveCount(0);

    await feed.amountFilter("$10 - $1,000").click();
    await feed.clearButton.click();
    await feed.closeButton.click();

    await expect(feed.amountFilter("$0 - $1,000")).toBeVisible();
    await expect(feed.transaction(small.id)).toBeVisible();
  });
});
