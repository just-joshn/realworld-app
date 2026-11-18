import type { Locator, Page } from "@playwright/test";

export class NotificationsPage {
  readonly heading: Locator;
  readonly emptyHeading: Locator;
  readonly dismissButtons: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Notifications", exact: true });
    this.emptyHeading = page.getByRole("heading", { name: "No Notifications" });
    this.dismissButtons = page.getByRole("button", { name: "Dismiss" });
  }

  async goto() {
    await this.page.goto("/notifications");
  }

  notification(id: string) {
    return this.page.getByTestId(`notification-list-item-${id}`);
  }

  markAsReadButton(id: string) {
    return this.notification(id).getByRole("button", { name: "mark as read" });
  }
}
