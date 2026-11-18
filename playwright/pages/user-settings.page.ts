import type { Locator, Page } from "@playwright/test";
import type { TestUser } from "../helpers/data";

type Profile = Pick<TestUser, "firstName" | "lastName" | "email" | "phoneNumber">;

export class UserSettingsPage {
  readonly heading: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly phoneNumber: Locator;
  readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "User Settings", exact: true });
    this.firstName = page.getByPlaceholder("First Name");
    this.lastName = page.getByPlaceholder("Last Name");
    this.email = page.getByPlaceholder("Email");
    this.phoneNumber = page.getByPlaceholder("Phone Number");
    this.saveButton = page.getByRole("button", { name: "Save" });
  }

  async goto() {
    await this.page.goto("/user/settings");
  }

  async save(profile: Profile) {
    await this.firstName.fill(profile.firstName);
    await this.lastName.fill(profile.lastName);
    await this.email.fill(profile.email);
    await this.phoneNumber.fill(profile.phoneNumber);
    await this.saveButton.click();
  }
}
