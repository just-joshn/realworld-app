import { test, expect } from "../fixtures/auth";

test.describe("user settings", { tag: ["@e2e", "@settings"] }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/user/settings");
  });

  test("the settings form shows the user's current details", async ({ page, user }) => {
    await expect(page.getByPlaceholder("First Name")).toHaveValue(user.firstName);
    await expect(page.getByPlaceholder("Last Name")).toHaveValue(user.lastName);
    await expect(page.getByPlaceholder("Email")).toHaveValue(user.email);
    await expect(page.getByPlaceholder("Phone Number")).toHaveValue(user.phoneNumber);
  });

  test("the settings form explains missing details", async ({ page, user }) => {
    await expect(page.getByPlaceholder("First Name")).toHaveValue(user.firstName);

    for (const placeholder of ["First Name", "Last Name", "Email", "Phone Number"]) {
      await page.getByPlaceholder(placeholder).clear();
    }
    await page.getByPlaceholder("First Name").focus();

    for (const message of [
      "Enter a first name",
      "Enter a last name",
      "Enter an email address",
      "Enter a phone number",
    ]) {
      await expect(page.getByText(message)).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("the settings form explains invalid details", async ({ page, user }) => {
    await expect(page.getByPlaceholder("Email")).toHaveValue(user.email);

    await page.getByPlaceholder("Email").fill("not-an-email");
    await page.getByPlaceholder("Phone Number").fill("not-a-phone");
    await page.getByPlaceholder("First Name").focus();

    await expect(page.getByText("Must contain a valid email address")).toBeVisible();
    await expect(page.getByText("Phone number is not valid")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
