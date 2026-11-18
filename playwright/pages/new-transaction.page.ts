import { expect, type Locator, type Page } from "@playwright/test";
import { fullName, type TestUser } from "../helpers/data";

export class NewTransactionPage {
  readonly search: Locator;
  readonly users: Locator;
  readonly amount: Locator;
  readonly note: Locator;
  readonly payButton: Locator;
  readonly requestButton: Locator;
  readonly submittedAlert: Locator;
  readonly returnToTransactionsLink: Locator;
  readonly createAnotherButton: Locator;

  constructor(private readonly page: Page) {
    this.search = page.getByPlaceholder("Search...");
    this.users = page.getByRole("listitem");
    this.amount = page.getByPlaceholder("Amount");
    this.note = page.getByPlaceholder("Add a note");
    this.payButton = page.getByRole("button", { name: "Pay" });
    this.requestButton = page.getByRole("button", { name: "Request" });
    this.submittedAlert = page.getByRole("alert");
    this.returnToTransactionsLink = page.getByRole("link", { name: "Return To Transactions" });
    this.createAnotherButton = page.getByRole("button", { name: "Create Another Transaction" });
  }

  async goto() {
    await this.page.goto("/transaction/new");
  }

  user(user: TestUser) {
    return this.users.filter({ hasText: fullName(user) });
  }

  heading(name: string) {
    return this.page.getByRole("heading", { name });
  }

  async pickRecipient(recipient: TestUser) {
    await this.search.fill(recipient.username);
    await this.user(recipient).click();
    await expect(this.heading(fullName(recipient))).toBeVisible();
  }
}
