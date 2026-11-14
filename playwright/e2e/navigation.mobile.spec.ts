import { test, expect } from "../fixtures/auth";

test.describe("navigation on a phone", { tag: ["@e2e", "@navigation"] }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("the menu starts closed and closes after the user picks a page", async ({ page }) => {
    const menu = page.getByRole("button", { name: "open drawer" });
    const balance = page.getByText("Account Balance");
    await expect(balance).toBeHidden();

    for (const [link, heading, url] of [
      ["My Account", "User Settings", "/user/settings"],
      ["Bank Accounts", "Bank Accounts", "/bankaccounts"],
      ["Notifications", "Notifications", "/notifications"],
    ] as const) {
      await menu.click();
      await expect(balance).toBeVisible();
      await page.getByRole("link", { name: link, exact: true }).click();

      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await expect(balance).toBeHidden();
    }

    await menu.click();
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });

  test("Escape closes the menu", async ({ page }) => {
    await page.getByRole("button", { name: "open drawer" }).click();
    await expect(page.getByText("Account Balance")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByText("Account Balance")).toBeHidden();
  });
});
