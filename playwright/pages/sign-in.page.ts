import type { Locator, Page } from "@playwright/test";

export class SignInPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly rememberMe: Locator;
  readonly signInButton: Locator;
  readonly signUpLink: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByLabel("Username");
    this.password = page.getByLabel("Password");
    this.rememberMe = page.getByRole("checkbox", { name: "Remember me" });
    this.signInButton = page.getByRole("button", { name: "Sign In" });
    this.signUpLink = page.getByRole("link", { name: "Don't have an account? Sign Up" });
    this.error = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/signin");
  }

  async signIn(user: { username: string; password: string }, { remember = false } = {}) {
    await this.username.fill(user.username);
    await this.password.fill(user.password);
    if (remember) await this.rememberMe.check();
    await this.signInButton.click();
  }
}
