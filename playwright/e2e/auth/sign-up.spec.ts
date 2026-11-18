import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/browser";
import { buildBankAccount, buildUser, type NewUser } from "../../helpers/data";

async function signUp(page: Page, user: NewUser) {
  await page.goto("/signup");
  await page.getByLabel(/^First Name/).fill(user.firstName);
  await page.getByLabel(/^Last Name/).fill(user.lastName);
  await page.getByLabel(/^Username/).fill(user.username);
  await page.getByLabel(/^Password/).fill(user.password);
  await page.getByLabel(/^Confirm Password/).fill(user.password);
  await page.getByRole("button", { name: "Sign Up" }).click();
}

test.describe("sign up and onboarding", { tag: ["@e2e", "@auth"] }, () => {
  test(
    "a new user signs up, signs in, and adds a bank account during onboarding",
    { tag: "@smoke" },
    async ({ page, signInPage, fake }) => {
      const user = buildUser(fake);
      const bankAccount = buildBankAccount(fake);

      await test.step("open the sign up form", async () => {
        await page.goto("/signin");
        await signInPage.signUpLink.click();
        await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible();
      });

      await test.step("submit the new account", async () => {
        await signUp(page, user);
        await expect(page).toHaveURL("/signin");
      });

      await test.step("sign in", async () => {
        await signInPage.signIn(user);
        await expect(
          page.getByRole("dialog").getByText("Get Started with Real World App")
        ).toBeVisible();
      });

      await test.step("add a bank account", async () => {
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: "Next" }).click();
        await expect(dialog.getByText("Create Bank Account")).toBeVisible();
        await dialog.getByPlaceholder("Bank Name").fill(bankAccount.bankName);
        await dialog.getByPlaceholder("Routing Number").fill(bankAccount.routingNumber);
        await dialog.getByPlaceholder("Account Number").fill(bankAccount.accountNumber);
        await dialog.getByRole("button", { name: "Save" }).click();
        await expect(dialog.getByText("You're all set!")).toBeVisible();
      });

      await test.step("finish onboarding", async () => {
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: "Done" }).click();
        await expect(dialog).toBeHidden();
      });

      await test.step("see the new account", async () => {
        await page.getByRole("link", { name: "Bank Accounts" }).click();
        await expect(page.getByText(bankAccount.bankName)).toBeVisible();
        await expect(page.getByText(`@${user.username}`)).toBeVisible();
        await expect(page.getByTestId("sidenav-user-balance")).toHaveText("$0.00");
      });
    }
  );

  test("a new user can log out from the onboarding dialog", async ({ page, signInPage, fake }) => {
    const user = buildUser(fake);
    await signUp(page, user);
    await signInPage.signIn(user);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Get Started with Real World App")).toBeVisible();

    await dialog.getByRole("button", { name: "Logout" }).click();

    await expect(page).toHaveURL("/signin");
    await expect(signInPage.signInButton).toBeVisible();
  });

  test("the sign up form explains every invalid field", async ({ page }) => {
    await page.goto("/signup");

    for (const label of [/^First Name/, /^Last Name/, /^Username/]) {
      await page.getByLabel(label).focus();
    }
    await page.getByLabel(/^Password/).fill("abc");
    await page.getByLabel(/^Confirm Password/).fill("abcd");
    await page.getByLabel(/^First Name/).focus();

    await expect(page.getByText("First Name is required")).toBeVisible();
    await expect(page.getByText("Last Name is required")).toBeVisible();
    await expect(page.getByText("Username is required")).toBeVisible();
    await expect(page.getByText("Password must contain at least 4 characters")).toBeVisible();
    await expect(page.getByText("Password does not match")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up" })).toBeDisabled();
  });

  test("a visitor goes from sign up back to sign in", async ({ page, signInPage }) => {
    await page.goto("/signup");

    await page.getByRole("link", { name: "Have an account? Sign In" }).click();

    await expect(page).toHaveURL("/signin");
    await expect(signInPage.signInButton).toBeVisible();
  });
});
