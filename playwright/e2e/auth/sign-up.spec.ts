import { test, expect } from "../../fixtures/browser";
import { buildBankAccount, buildUser } from "../../helpers/data";

test.describe("sign up and onboarding", { tag: ["@e2e", "@auth"] }, () => {
  test(
    "a new user signs up, signs in, and adds a bank account during onboarding",
    { tag: "@smoke" },
    async ({ page, signInPage, signUpPage, onboardingDialog, navDrawer, fake }) => {
      const user = buildUser(fake);
      const bankAccount = buildBankAccount(fake);

      await test.step("open the sign up form", async () => {
        await signInPage.goto();
        await signInPage.signUpLink.click();
        await expect(signUpPage.heading).toBeVisible();
      });

      await test.step("submit the new account", async () => {
        await signUpPage.signUp(user);
        await expect(page).toHaveURL("/signin");
      });

      await test.step("sign in", async () => {
        await signInPage.signIn(user);
        await expect(onboardingDialog.welcome).toBeVisible();
      });

      await test.step("add a bank account", async () => {
        await onboardingDialog.nextButton.click();
        await expect(onboardingDialog.bankAccountStep).toBeVisible();
        await onboardingDialog.bankAccountForm.save(bankAccount);
        await expect(onboardingDialog.finished).toBeVisible();
      });

      await test.step("finish onboarding", async () => {
        await onboardingDialog.doneButton.click();
        await expect(onboardingDialog.dialog).toBeHidden();
      });

      await test.step("see the new account", async () => {
        await navDrawer.bankAccountsLink.click();
        await expect(page.getByText(bankAccount.bankName)).toBeVisible();
        await expect(page.getByText(`@${user.username}`)).toBeVisible();
        await expect(navDrawer.balance).toHaveText("$0.00");
      });
    }
  );

  test("a new user can log out from the onboarding dialog", async ({
    page,
    signInPage,
    signUpPage,
    onboardingDialog,
    fake,
  }) => {
    const user = buildUser(fake);
    await signUpPage.goto();
    await signUpPage.signUp(user);
    await signInPage.signIn(user);
    await expect(onboardingDialog.welcome).toBeVisible();

    await onboardingDialog.logoutButton.click();

    await expect(page).toHaveURL("/signin");
    await expect(signInPage.signInButton).toBeVisible();
  });

  test("the sign up form explains every invalid field", async ({ page, signUpPage }) => {
    await signUpPage.goto();

    for (const field of [signUpPage.firstName, signUpPage.lastName, signUpPage.username]) {
      await field.focus();
    }
    await signUpPage.password.fill("abc");
    await signUpPage.confirmPassword.fill("abcd");
    await signUpPage.firstName.focus();

    await expect(page.getByText("First Name is required")).toBeVisible();
    await expect(page.getByText("Last Name is required")).toBeVisible();
    await expect(page.getByText("Username is required")).toBeVisible();
    await expect(page.getByText("Password must contain at least 4 characters")).toBeVisible();
    await expect(page.getByText("Password does not match")).toBeVisible();
    await expect(signUpPage.signUpButton).toBeDisabled();
  });

  test("a visitor goes from sign up back to sign in", async ({ page, signInPage, signUpPage }) => {
    await signUpPage.goto();

    await signUpPage.signInLink.click();

    await expect(page).toHaveURL("/signin");
    await expect(signInPage.signInButton).toBeVisible();
  });
});
