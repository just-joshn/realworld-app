import type { Locator, Page } from "@playwright/test";
import { BankAccountForm } from "../components/bank-account-form.component";

export class BankAccountsPage {
  readonly heading: Locator;
  readonly createLink: Locator;
  readonly createHeading: Locator;
  readonly form: BankAccountForm;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Bank Accounts", exact: true });
    this.createLink = page.getByRole("link", { name: "Create" });
    this.createHeading = page.getByRole("heading", { name: "Create Bank Account" });
    this.form = new BankAccountForm(page);
  }

  async goto() {
    await this.page.goto("/bankaccounts");
  }

  async gotoCreate() {
    await this.page.goto("/bankaccounts/new");
  }

  account(id: string) {
    return this.page.getByTestId(`bankaccount-list-item-${id}`);
  }

  deleteButton(id: string) {
    return this.account(id).getByRole("button", { name: "Delete" });
  }
}
