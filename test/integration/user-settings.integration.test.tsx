import { expect, test } from "vitest";
import { renderSignedIn } from "./app";

test("a user updates their profile and sees the new name in the side navigation", async () => {
  const screen = await renderSignedIn();

  await screen.getByRole("link", { name: "My Account" }).click();
  await expect.element(screen.getByRole("heading", { name: "User Settings" })).toBeVisible();
  await expect.element(screen.getByPlaceholder("First Name")).toHaveValue("Ted");

  await screen.getByPlaceholder("First Name").fill("Theodore");
  await screen.getByPlaceholder("Last Name").fill("Logan");
  await screen.getByPlaceholder("Email").fill("theodore@example.com");
  await screen.getByPlaceholder("Phone Number").fill("555-555-1234");
  await screen.getByRole("button", { name: "Save" }).click();

  await expect.element(screen.getByText("Theodore L", { exact: true })).toBeVisible();
  await expect.element(screen.getByPlaceholder("Email")).toHaveValue("theodore@example.com");
});

test("the settings form explains missing and invalid details", async () => {
  const screen = await renderSignedIn({ route: "/user/settings" });
  await expect.element(screen.getByPlaceholder("First Name")).toHaveValue("Ted");

  for (const placeholder of ["First Name", "Last Name", "Email", "Phone Number"]) {
    await screen.getByPlaceholder(placeholder).clear();
  }
  await screen.getByPlaceholder("First Name").click();
  for (const message of [
    "Enter a first name",
    "Enter a last name",
    "Enter an email address",
    "Enter a phone number",
  ]) {
    await expect.element(screen.getByText(message)).toBeVisible();
  }

  await screen.getByPlaceholder("Email").fill("not-an-email");
  await screen.getByPlaceholder("Phone Number").fill("not-a-phone");
  await expect.element(screen.getByText("Must contain a valid email address")).toBeVisible();
  await expect.element(screen.getByText("Phone number is not valid")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
