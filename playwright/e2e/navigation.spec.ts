import { test, expect } from "../fixtures/auth";
import { createTransaction, getUnreadNotifications } from "../helpers/api";

test.describe("navigation", { tag: ["@e2e", "@navigation"] }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("a user hides and shows the side navigation", async ({ page }) => {
    const balance = page.getByText("Account Balance");
    await expect(balance).toBeVisible();

    await page.getByRole("button", { name: "open drawer" }).click();
    await expect(balance).toBeHidden();

    await page.getByRole("button", { name: "open drawer" }).click();
    await expect(balance).toBeVisible();
  });

  test("the side navigation links open each page", async ({ page }) => {
    await page.getByRole("link", { name: "My Account" }).click();
    await expect(page).toHaveURL("/user/settings");
    await expect(page.getByRole("heading", { name: "User Settings", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Bank Accounts" }).click();
    await expect(page).toHaveURL("/bankaccounts");
    await expect(page.getByRole("heading", { name: "Bank Accounts", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Notifications", exact: true }).click();
    await expect(page).toHaveURL("/notifications");
    await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("tab", { name: "Everyone" })).toBeVisible();
  });

  test("the notification bell shows the unread count and opens notifications", async ({
    page,
    user,
    userApi,
    createUser,
    apiAs,
  }) => {
    await createTransaction(await apiAs(await createUser({ balance: 1_000 })), {
      transactionType: "payment",
      receiverId: user.id,
      amount: 1,
      description: "Ring the bell",
    });
    const unread = (await getUnreadNotifications(userApi)).length;
    await page.reload();

    await page.getByRole("link", { name: String(unread), exact: true }).click();

    await expect(page).toHaveURL("/notifications");
    await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
  });

  test("the New button starts a transaction", async ({ page }) => {
    await page.getByRole("link", { name: "New" }).click();

    await expect(page).toHaveURL("/transaction/new");
    await expect(page.getByPlaceholder("Search...")).toBeVisible();
  });
});
