import type { Locator, Page } from "@playwright/test";
import type { NewBankAccount } from "../helpers/data";

export class BankAccountForm {
  readonly bankName: Locator;
  readonly routingNumber: Locator;
  readonly accountNumber: Locator;
  readonly saveButton: Locator;

  /** `scope` is the page, or the onboarding dialog that embeds the same form. */
  constructor(scope: Page | Locator) {
    this.bankName = scope.getByPlaceholder("Bank Name");
    this.routingNumber = scope.getByPlaceholder("Routing Number");
    this.accountNumber = scope.getByPlaceholder("Account Number");
    this.saveButton = scope.getByRole("button", { name: "Save" });
  }

  async save(account: NewBankAccount) {
    await this.bankName.fill(account.bankName);
    await this.routingNumber.fill(account.routingNumber);
    await this.accountNumber.fill(account.accountNumber);
    await this.saveButton.click();
  }
}
