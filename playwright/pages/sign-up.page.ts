import type { Locator, Page } from "@playwright/test";
import { routes } from "../helpers/contracts";
import type { NewUser } from "../helpers/data";

export class SignUpPage {
  readonly heading: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly username: Locator;
  readonly password: Locator;
  readonly confirmPassword: Locator;
  readonly signUpButton: Locator;
  readonly signInLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Sign Up" });
    this.firstName = page.getByLabel(/^First Name/);
    this.lastName = page.getByLabel(/^Last Name/);
    this.username = page.getByLabel(/^Username/);
    this.password = page.getByLabel(/^Password/);
    this.confirmPassword = page.getByLabel(/^Confirm Password/);
    this.signUpButton = page.getByRole("button", { name: "Sign Up" });
    this.signInLink = page.getByRole("link", { name: "Have an account? Sign In" });
  }

  async goto() {
    await this.page.goto(routes.signUp);
  }

  async signUp(user: NewUser) {
    await this.firstName.fill(user.firstName);
    await this.lastName.fill(user.lastName);
    await this.username.fill(user.username);
    await this.password.fill(user.password);
    await this.confirmPassword.fill(user.password);
    await this.signUpButton.click();
  }
}
