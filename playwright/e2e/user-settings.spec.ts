import { test, expect } from "../fixtures/auth";

test.describe("user settings", { tag: ["@e2e", "@settings"] }, () => {
  test.beforeEach(async ({ userSettingsPage }) => {
    await userSettingsPage.goto();
  });

  test("the settings form shows the user's current details", async ({
    userSettingsPage: settings,
    user,
  }) => {
    await expect(settings.firstName).toHaveValue(user.firstName);
    await expect(settings.lastName).toHaveValue(user.lastName);
    await expect(settings.email).toHaveValue(user.email);
    await expect(settings.phoneNumber).toHaveValue(user.phoneNumber);
  });

  test("the settings form explains missing details", async ({
    page,
    userSettingsPage: settings,
    user,
  }) => {
    await expect(settings.firstName).toHaveValue(user.firstName);

    for (const field of [settings.firstName, settings.lastName, settings.email, settings.phoneNumber]) {
      await field.clear();
    }
    await settings.firstName.focus();

    for (const message of [
      "Enter a first name",
      "Enter a last name",
      "Enter an email address",
      "Enter a phone number",
    ]) {
      await expect(page.getByText(message)).toBeVisible();
    }
    await expect(settings.saveButton).toBeDisabled();
  });

  test("the settings form explains invalid details", async ({
    page,
    userSettingsPage: settings,
    user,
  }) => {
    await expect(settings.email).toHaveValue(user.email);

    await settings.email.fill("not-an-email");
    await settings.phoneNumber.fill("not-a-phone");
    await settings.firstName.focus();

    await expect(page.getByText("Must contain a valid email address")).toBeVisible();
    await expect(page.getByText("Phone number is not valid")).toBeVisible();
    await expect(settings.saveButton).toBeDisabled();
  });
});
