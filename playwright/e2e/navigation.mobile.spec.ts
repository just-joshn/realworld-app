import { test, expect } from "../fixtures/auth";

test.describe("navigation on a phone", { tag: ["@e2e", "@navigation"] }, () => {
  test.beforeEach(async ({ transactionFeedPage }) => {
    await transactionFeedPage.goto();
  });

  test("the menu starts closed and closes after the user picks a page", async ({
    page,
    navDrawer,
    userSettingsPage,
    bankAccountsPage,
    notificationsPage,
  }) => {
    await expect(navDrawer.balanceLabel).toBeHidden();

    for (const [link, heading, url] of [
      [navDrawer.myAccountLink, userSettingsPage.heading, "/user/settings"],
      [navDrawer.bankAccountsLink, bankAccountsPage.heading, "/bankaccounts"],
      [navDrawer.notificationsLink, notificationsPage.heading, "/notifications"],
    ] as const) {
      await navDrawer.toggleButton.click();
      await expect(navDrawer.balanceLabel).toBeVisible();
      await link.click();

      await expect(page).toHaveURL(url);
      await expect(heading).toBeVisible();
      await expect(navDrawer.balanceLabel).toBeHidden();
    }

    await navDrawer.toggleButton.click();
    await navDrawer.homeLink.click();
    await expect(page).toHaveURL("/");
  });

  test("Escape closes the menu", async ({ page, navDrawer }) => {
    await navDrawer.toggleButton.click();
    await expect(navDrawer.balanceLabel).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(navDrawer.balanceLabel).toBeHidden();
  });
});
