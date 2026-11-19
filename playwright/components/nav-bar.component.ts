import type { Locator, Page } from "@playwright/test";

export class NavBar {
  readonly newTransactionLink: Locator;

  constructor(private readonly page: Page) {
    this.newTransactionLink = page.getByRole("link", { name: "New" });
  }

  notificationsBell(unread: number) {
    return this.page.getByRole("link", { name: `${String(unread)} unread notifications` });
  }
}
