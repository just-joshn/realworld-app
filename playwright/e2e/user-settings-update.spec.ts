import { test, expect } from "../fixtures/browser";
import { getCurrentUser } from "../helpers/api";

// Renaming the shared worker account would break other tests' assertions, so this test signs in
// as its own user.
test.describe("updating user settings", { tag: ["@e2e", "@settings"] }, () => {
  test("a user updates their profile and sees the new name in the side navigation", async ({
    page,
    signInPage,
    navDrawer,
    userSettingsPage,
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
    await navDrawer.myAccountLink.click();
    await expect(userSettingsPage.firstName).toHaveValue(onboardedUser.firstName);

    await userSettingsPage.save(edits);

    await expect(
      page.getByText(`${edits.firstName} ${edits.lastName.charAt(0)}`, { exact: true })
    ).toBeVisible();
    await expect(userSettingsPage.email).toHaveValue(edits.email);
    expect(await getCurrentUser(await apiAs(onboardedUser))).toMatchObject(edits);
  });
});
