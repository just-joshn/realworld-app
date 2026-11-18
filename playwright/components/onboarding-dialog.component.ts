import type { Locator, Page } from "@playwright/test";
import { BankAccountForm } from "./bank-account-form.component";

export class OnboardingDialog {
  readonly dialog: Locator;
  readonly welcome: Locator;
  readonly nextButton: Locator;
  readonly bankAccountStep: Locator;
  readonly bankAccountForm: BankAccountForm;
  readonly finished: Locator;
  readonly doneButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole("dialog");
    this.welcome = this.dialog.getByText("Get Started with Real World App");
    this.nextButton = this.dialog.getByRole("button", { name: "Next" });
    this.bankAccountStep = this.dialog.getByText("Create Bank Account");
    this.bankAccountForm = new BankAccountForm(this.dialog);
    this.finished = this.dialog.getByText("You're all set!");
    this.doneButton = this.dialog.getByRole("button", { name: "Done" });
    this.logoutButton = this.dialog.getByRole("button", { name: "Logout" });
  }
}
