import { test, expect } from "../../fixtures/browser";

test.describe("sign out on a phone", { tag: ["@e2e", "@auth"] }, () => {
  test("a user signs out from the menu", async ({ page, signInPage, onboardedUser }) => {
    await signInPage.goto();
    await signInPage.signIn(onboardedUser);
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "open drawer" }).click();
    await page.getByRole("button", { name: "Logout" }).click();

    await expect(page).toHaveURL("/signin");
    await expect(signInPage.signInButton).toBeVisible();
  });
});
