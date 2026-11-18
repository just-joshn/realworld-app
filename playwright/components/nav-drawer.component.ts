import type { Locator, Page } from "@playwright/test";

export class NavDrawer {
  readonly toggleButton: Locator;
  readonly balanceLabel: Locator;
  readonly balance: Locator;
  readonly homeLink: Locator;
  readonly myAccountLink: Locator;
  readonly bankAccountsLink: Locator;
  readonly notificationsLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.toggleButton = page.getByRole("button", { name: "open drawer" });
    this.balanceLabel = page.getByText("Account Balance");
    this.balance = page.getByTestId("sidenav-user-balance");
    this.homeLink = page.getByRole("link", { name: "Home", exact: true });
    this.myAccountLink = page.getByRole("link", { name: "My Account", exact: true });
    this.bankAccountsLink = page.getByRole("link", { name: "Bank Accounts", exact: true });
    this.notificationsLink = page.getByRole("link", { name: "Notifications", exact: true });
    this.logoutButton = page.getByRole("button", { name: "Logout" });
  }
}
