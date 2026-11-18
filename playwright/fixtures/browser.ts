import type { ConsoleMessage } from "@playwright/test";
import { test as base, expect } from "./base";
import { NavBar } from "../components/nav-bar.component";
import { NavDrawer } from "../components/nav-drawer.component";
import { OnboardingDialog } from "../components/onboarding-dialog.component";
import { BankAccountsPage } from "../pages/bank-accounts.page";
import { NewTransactionPage } from "../pages/new-transaction.page";
import { NotificationsPage } from "../pages/notifications.page";
import { SignInPage } from "../pages/sign-in.page";
import { SignUpPage } from "../pages/sign-up.page";
import { TransactionDetailPage } from "../pages/transaction-detail.page";
import { TransactionFeedPage } from "../pages/transaction-feed.page";
import { UserSettingsPage } from "../pages/user-settings.page";

const ignoredBrowserErrors = [/favicon/i, /ResizeObserver loop/];

function consoleErrorText(message: ConsoleMessage) {
  const location = message.location();
  if (location.url.length === 0) return message.text();
  return `${message.text()} (${location.url}:${String(location.lineNumber)})`;
}

type PageObjects = {
  navBar: NavBar;
  navDrawer: NavDrawer;
  onboardingDialog: OnboardingDialog;
  bankAccountsPage: BankAccountsPage;
  newTransactionPage: NewTransactionPage;
  notificationsPage: NotificationsPage;
  signInPage: SignInPage;
  signUpPage: SignUpPage;
  transactionDetailPage: TransactionDetailPage;
  transactionFeedPage: TransactionFeedPage;
  userSettingsPage: UserSettingsPage;
};

export const test = base.extend<{ allowedBrowserErrors: RegExp[] } & PageObjects>({
  allowedBrowserErrors: [[], { option: true }],
  navBar: ({ page }, use) => use(new NavBar(page)),
  navDrawer: ({ page }, use) => use(new NavDrawer(page)),
  onboardingDialog: ({ page }, use) => use(new OnboardingDialog(page)),
  bankAccountsPage: ({ page }, use) => use(new BankAccountsPage(page)),
  newTransactionPage: ({ page }, use) => use(new NewTransactionPage(page)),
  notificationsPage: ({ page }, use) => use(new NotificationsPage(page)),
  signInPage: ({ page }, use) => use(new SignInPage(page)),
  signUpPage: ({ page }, use) => use(new SignUpPage(page)),
  transactionDetailPage: ({ page }, use) => use(new TransactionDetailPage(page)),
  transactionFeedPage: ({ page }, use) => use(new TransactionFeedPage(page)),
  userSettingsPage: ({ page }, use) => use(new UserSettingsPage(page)),
  page: async ({ page, allowedBrowserErrors }, use, testInfo) => {
    const ignored = [...ignoredBrowserErrors, ...allowedBrowserErrors];
    const isIgnored = (text: string) => ignored.some((pattern) => pattern.test(text));
    const errors: string[] = [];
    const onConsole = (message: ConsoleMessage) => {
      if (message.type() !== "error") return;
      const text = consoleErrorText(message);
      if (!isIgnored(text)) errors.push(text);
    };
    const onPageError = (error: Error) => {
      const text = error.stack ?? error.message;
      if (!isIgnored(text)) errors.push(text);
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    await use(page);
    if (errors.length === 0) return;
    await testInfo.attach("browser-errors", {
      body: errors.join("\n"),
      contentType: "text/plain",
    });
    throw new Error(`Unexpected browser errors:\n${errors.join("\n")}`);
  },
});

export { expect };
