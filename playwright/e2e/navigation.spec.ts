import { test, expect } from "../fixtures/auth";
import { createTransaction, getUnreadNotifications } from "../helpers/api";
import { routes } from "../helpers/contracts";

test.describe("navigation", { tag: ["@e2e", "@navigation"] }, () => {
  test.beforeEach(async ({ transactionFeedPage }) => {
    await transactionFeedPage.goto();
  });

  test("a user hides and shows the side navigation", async ({ navDrawer }) => {
    await expect(navDrawer.balanceLabel).toBeVisible();

    await navDrawer.toggleButton.click();
    await expect(navDrawer.balanceLabel).toBeHidden();

    await navDrawer.toggleButton.click();
    await expect(navDrawer.balanceLabel).toBeVisible();
  });

  test("the side navigation links open each page", async ({
    page,
    navDrawer,
    userSettingsPage,
    bankAccountsPage,
    notificationsPage,
    transactionFeedPage,
  }) => {
    await navDrawer.myAccountLink.click();
    await expect(page).toHaveURL(routes.userSettings);
    await expect(userSettingsPage.heading).toBeVisible();

    await navDrawer.bankAccountsLink.click();
    await expect(page).toHaveURL(routes.bankAccounts);
    await expect(bankAccountsPage.heading).toBeVisible();

    await navDrawer.notificationsLink.click();
    await expect(page).toHaveURL(routes.notifications);
    await expect(notificationsPage.heading).toBeVisible();

    await navDrawer.homeLink.click();
    await expect(page).toHaveURL(routes.home);
    await expect(transactionFeedPage.everyoneTab).toBeVisible();
  });

  test("the notification bell shows the unread count and opens notifications", async ({
    page,
    navBar,
    notificationsPage,
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

    await navBar.notificationsBell(unread).click();

    await expect(page).toHaveURL(routes.notifications);
    await expect(notificationsPage.heading).toBeVisible();
  });

  test("the New button starts a transaction", async ({ page, navBar, newTransactionPage }) => {
    await navBar.newTransactionLink.click();

    await expect(page).toHaveURL(routes.transactionNew);
    await expect(newTransactionPage.search).toBeVisible();
  });
});
