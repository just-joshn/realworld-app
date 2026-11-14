import { test, expect } from "../../fixtures/base";
import { formatCents } from "../../helpers/data";

test.describe("sign in", { tag: ["@e2e", "@auth"] }, () => {
  test("a visitor opening a private page is sent to sign in", async ({ page, signInPage }) => {
    await page.goto("/notifications");

    await expect(page).toHaveURL("/signin");
    await expect(signInPage.signInButton).toBeVisible();
  });

  test(
    "a user signs in and lands on the home feed with their name and balance",
    { tag: "@smoke" },
    async ({ page, signInPage, onboardedUser }) => {
      await signInPage.goto();

      await signInPage.signIn(onboardedUser);

      await expect(page).toHaveURL("/");
      await expect(
        page.getByText(`${onboardedUser.firstName} ${onboardedUser.lastName.charAt(0)}`, {
          exact: true,
        })
      ).toBeVisible();
      await expect(page.getByText(`@${onboardedUser.username}`)).toBeVisible();
      await expect(page.getByTestId("sidenav-user-balance")).toHaveText(
        formatCents(onboardedUser.balance)
      );
      await expect(page.getByRole("tab", { name: "Everyone" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    }
  );

  test("a user with the wrong password is told the credentials are invalid", async ({
    page,
    signInPage,
    onboardedUser,
  }) => {
    await signInPage.goto();

    await signInPage.signIn({ ...onboardedUser, password: `${onboardedUser.password}-wrong` });

    await expect(signInPage.error).toHaveText("Username or password is invalid");
    await expect(page).toHaveURL("/signin");
  });

  test("the sign in form explains missing fields before submitting", async ({ signInPage }) => {
    await signInPage.goto();

    await signInPage.username.focus();
    await signInPage.password.fill("abc");
    await signInPage.username.focus();

    await expect(signInPage.page.getByText("Username is required")).toBeVisible();
    await expect(
      signInPage.page.getByText("Password must contain at least 4 characters")
    ).toBeVisible();
    await expect(signInPage.signInButton).toBeDisabled();
  });

  test("remember me keeps the session for 30 days", async ({
    page,
    context,
    signInPage,
    onboardedUser,
  }) => {
    await signInPage.goto();

    await signInPage.signIn(onboardedUser, { remember: true });

    await expect(page).toHaveURL("/");
    const session = (await context.cookies()).find(({ name }) => name === "connect.sid");
    const daysLeft = ((session?.expires ?? 0) * 1000 - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysLeft).toBeGreaterThan(29.9);
    expect(daysLeft).toBeLessThanOrEqual(30);
  });

  test("a user signs out from the side navigation", async ({ page, signInPage, onboardedUser }) => {
    await signInPage.goto();
    await signInPage.signIn(onboardedUser);
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "Logout" }).click();

    await expect(page).toHaveURL("/signin");
    await expect(signInPage.signInButton).toBeVisible();
    await page.goto("/");
    await expect(page).toHaveURL("/signin");
  });
});
