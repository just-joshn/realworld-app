import { test, expect } from "../fixtures/auth";
import {
  commentOnTransaction,
  createTransaction,
  getUnreadNotifications,
  likeTransaction,
} from "../helpers/api";
import { fullName } from "../helpers/data";

test.describe("notifications", { tag: ["@e2e", "@notifications"] }, () => {
  test("a user reads who paid, liked, commented on, and requested money from them", async ({
    page,
    user,
    createUser,
    apiAs,
  }) => {
    const friend = await createUser({ balance: 10_000 });
    const friendApi = await apiAs(friend);
    const payment = await createTransaction(friendApi, {
      transactionType: "payment",
      receiverId: user.id,
      amount: 5,
      description: "For you",
    });
    await likeTransaction(friendApi, payment.id);
    await commentOnTransaction(friendApi, payment.id, "Enjoy!");
    await createTransaction(friendApi, {
      transactionType: "request",
      receiverId: user.id,
      amount: 7,
      description: "Your share",
    });

    await page.goto("/");
    await page.getByRole("link", { name: "Notifications", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
    for (const text of [
      `${fullName(friend)} liked a transaction.`,
      `${fullName(friend)} commented on a transaction.`,
      `${fullName(friend)} requested payment.`,
    ]) {
      await expect(page.getByText(text, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(/ received payment\.$/).first()).toBeVisible();
  });

  test("dismissing every notification leaves an empty inbox", async ({
    page,
    user,
    userApi,
    createUser,
    apiAs,
  }) => {
    const friendApi = await apiAs(await createUser({ balance: 10_000 }));
    for (const amount of [1, 2]) {
      await createTransaction(friendApi, {
        transactionType: "payment",
        receiverId: user.id,
        amount,
        description: "Gift",
      });
    }
    await page.goto("/notifications");
    const dismiss = page.getByRole("button", { name: "Dismiss" });
    await expect(dismiss.first()).toBeVisible();

    for (let remaining = await dismiss.count(); remaining > 0; remaining--) {
      await dismiss.first().click();
      await expect(dismiss).toHaveCount(remaining - 1);
    }

    await expect(page.getByRole("heading", { name: "No Notifications" })).toBeVisible();
    expect(await getUnreadNotifications(userApi)).toEqual([]);
    await page.reload();
    await expect(page.getByRole("heading", { name: "No Notifications" })).toBeVisible();
  });
});
