import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { history, mobile, renderSignedIn } from "./app";

test("on a desktop, a user hides and shows the side navigation", async () => {
  const screen = await renderSignedIn();
  const balance = screen.getByText("Account Balance");
  await expect.element(balance).toBeVisible();

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(balance).not.toBeVisible();

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(balance).toBeVisible();
});

test("on a phone, the menu closes after the user picks a page", async () => {
  const screen = await renderSignedIn({ viewport: mobile });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(page.getByText("Account Balance")).toBeVisible();
  await page.getByRole("link", { name: "My Account" }).click();

  await expect.element(screen.getByRole("heading", { name: "User Settings" })).toBeVisible();
  await expect.element(page.getByText("Account Balance")).not.toBeInTheDocument();

  await screen.getByRole("button", { name: "open drawer" }).click();
  await page.getByRole("link", { name: "Bank Accounts" }).click();
  await expect.element(screen.getByRole("heading", { name: "Bank Accounts" })).toBeVisible();
  await expect.element(page.getByText("Account Balance")).not.toBeInTheDocument();

  await screen.getByRole("button", { name: "open drawer" }).click();
  await page.getByRole("link", { name: "Notifications" }).click();
  await expect.element(screen.getByRole("heading", { name: "Notifications" })).toBeVisible();

  await screen.getByRole("button", { name: "open drawer" }).click();
  await page.getByRole("link", { name: "Home" }).click();
  await expect.poll(() => history.location.pathname).toBe("/");
});

test("on a phone, Escape closes the menu", async () => {
  const screen = await renderSignedIn({ viewport: mobile });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(page.getByText("Account Balance")).toBeVisible();
  await userEvent.keyboard("{Escape}");

  await expect.element(page.getByText("Account Balance")).not.toBeInTheDocument();
});

test("on a phone, a user signs out from the menu", async () => {
  const screen = await renderSignedIn({ viewport: mobile });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await page.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("the notification bell opens the notifications page", async () => {
  const screen = await renderSignedIn({ route: "/user/settings" });

  await screen.getByRole("link", { name: "8" }).click();

  await expect.element(screen.getByRole("heading", { name: "Notifications" })).toBeVisible();
});
