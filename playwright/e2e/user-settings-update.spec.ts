import { test, expect } from "../fixtures/browser";
import { getCurrentUser } from "../helpers/api";

// Renaming the shared worker account would break other tests' assertions, so this test signs in
// as its own user.
test.describe("updating user settings", { tag: ["@e2e", "@settings"] }, () => {
  test("a user updates their profile and sees the new name in the side navigation", async ({
    page,
    signInPage,
    onboardedUser,
    apiAs,
    fake,
  }) => {
    const edits = {
      firstName: fake.name.firstName(),
      lastName: fake.name.lastName(),
      email: fake.internet.email(),
      phoneNumber: fake.phone.phoneNumber("###-###-####"),
    };
    await signInPage.goto();
    await signInPage.signIn(onboardedUser);
    await page.getByRole("link", { name: "My Account" }).click();
    await expect(page.getByPlaceholder("First Name")).toHaveValue(onboardedUser.firstName);

    await page.getByPlaceholder("First Name").fill(edits.firstName);
    await page.getByPlaceholder("Last Name").fill(edits.lastName);
    await page.getByPlaceholder("Email").fill(edits.email);
    await page.getByPlaceholder("Phone Number").fill(edits.phoneNumber);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByText(`${edits.firstName} ${edits.lastName.charAt(0)}`, { exact: true })
    ).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toHaveValue(edits.email);
    expect(await getCurrentUser(await apiAs(onboardedUser))).toMatchObject(edits);
  });
});
