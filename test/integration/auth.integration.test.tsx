import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { history, SEEDED_PASSWORD, renderApp, renderSignedIn, signIn, seededUsers } from "./app";

test("a visitor opening a private page is sent to sign in", async () => {
  const screen = await renderApp({ route: "/notifications" });

  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect.poll(() => history.location.pathname).toBe("/signin");
});

test("a seeded user signs in and lands on the public feed with their balance", async () => {
  const screen = await renderApp({ route: "/signin" });

  await signIn(screen, seededUsers.heath.username);

  await expect.poll(() => history.location.pathname).toBe("/");
  await expect.element(screen.getByText("Ted P", { exact: true })).toBeVisible();
  await expect.element(screen.getByText(`@${seededUsers.heath.username}`)).toBeVisible();
  await expect.element(screen.getByText("Account Balance")).toBeVisible();
  await expect.element(screen.getByRole("tab", { name: "Everyone" })).toBeVisible();
});

test("a user with the wrong password is told the credentials are invalid", async () => {
  const screen = await renderApp({ route: "/signin" });

  await screen.getByLabelText("Username").fill(seededUsers.heath.username);
  await screen.getByLabelText("Password").fill("wrong-password");
  await screen.getByRole("button", { name: "Sign In" }).click();

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("Username or password is invalid");
  await expect.poll(() => history.location.pathname).toBe("/signin");
});

test("the sign in form explains missing fields before submitting", async () => {
  const screen = await renderApp({ route: "/signin" });

  await screen.getByLabelText("Username").click();
  await screen.getByLabelText("Password").fill("abc");
  await screen.getByLabelText("Username").click();

  await expect.element(screen.getByText("Username is required")).toBeVisible();
  await expect
    .element(screen.getByText("Password must contain at least 4 characters"))
    .toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeDisabled();
});

test("a user signs out from the side navigation", async () => {
  const screen = await renderSignedIn();

  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect.poll(() => history.location.pathname).toBe("/signin");
});

test("a new user signs up, signs in, and completes onboarding with a bank account", async () => {
  const screen = await renderApp({ route: "/signin" });

  await screen.getByRole("link", { name: "Don't have an account? Sign Up" }).click();
  await expect.element(screen.getByRole("heading", { name: "Sign Up" })).toBeVisible();
  await screen.getByLabelText(/^First Name/).fill("Grace");
  await screen.getByLabelText(/^Last Name/).fill("Hopper");
  await screen.getByLabelText(/^Username/).fill("grace");
  await screen.getByLabelText(/^Password/).fill(SEEDED_PASSWORD);
  await screen.getByLabelText(/^Confirm Password/).fill(SEEDED_PASSWORD);
  await screen.getByRole("button", { name: "Sign Up" }).click();

  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
  await signIn(screen, "grace");

  const dialog = page.getByRole("dialog");
  await expect.element(dialog.getByText("Get Started with Real World App")).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect.element(dialog.getByText("Create Bank Account")).toBeVisible();
  await dialog.getByPlaceholder("Bank Name").fill("Grace Savings");
  await dialog.getByPlaceholder("Routing Number").fill("987654321");
  await dialog.getByPlaceholder("Account Number").fill("123456789");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect.element(dialog.getByText("Finished")).toBeVisible();
  await expect.element(dialog.getByText(/You're all set!/)).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();

  await screen.getByRole("link", { name: "Bank Accounts" }).click();
  await expect.element(screen.getByText("Grace Savings")).toBeVisible();
  await expect.element(screen.getByText("Grace H", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("$0.00")).toBeVisible();
});

test("a new user can log out from the onboarding dialog", async () => {
  const screen = await renderApp({ route: "/signup" });
  await screen.getByLabelText(/^First Name/).fill("Alan");
  await screen.getByLabelText(/^Last Name/).fill("Turing");
  await screen.getByLabelText(/^Username/).fill("alan");
  await screen.getByLabelText(/^Password/).fill(SEEDED_PASSWORD);
  await screen.getByLabelText(/^Confirm Password/).fill(SEEDED_PASSWORD);
  await screen.getByRole("button", { name: "Sign Up" }).click();
  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
  await signIn(screen, "alan");

  const dialog = page.getByRole("dialog");
  await expect.element(dialog.getByText("Get Started with Real World App")).toBeVisible();
  await dialog.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("the sign up form explains every invalid field", async () => {
  const screen = await renderApp({ route: "/signup" });

  for (const label of [/^First Name/, /^Last Name/, /^Username/]) {
    await screen.getByLabelText(label).click();
  }
  await screen.getByLabelText(/^Password/).fill("abc");
  await screen.getByLabelText(/^Confirm Password/).fill("abcd");
  await screen.getByLabelText(/^First Name/).click();

  await expect.element(screen.getByText("First Name is required")).toBeVisible();
  await expect.element(screen.getByText("Last Name is required")).toBeVisible();
  await expect.element(screen.getByText("Username is required")).toBeVisible();
  await expect
    .element(screen.getByText("Password must contain at least 4 characters"))
    .toBeVisible();
  await expect.element(screen.getByText("Password does not match")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Sign Up" })).toBeDisabled();

  await screen.getByRole("link", { name: "Have an account? Sign In" }).click();
  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
});
