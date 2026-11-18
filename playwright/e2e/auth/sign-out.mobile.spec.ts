import { test, expect } from "../../fixtures/browser";

test.describe("sign out on a phone", { tag: ["@e2e", "@auth"] }, () => {
  test("a user signs out from the menu", async ({ page, signInPage, navDrawer, onboardedUser }) => {
    await signInPage.goto();
    await signInPage.signIn(onboardedUser);
    await expect(page).toHaveURL("/");

    await navDrawer.toggleButton.click();
    await navDrawer.logoutButton.click();

    await expect(page).toHaveURL("/signin");
    await expect(signInPage.signInButton).toBeVisible();
  });
});
