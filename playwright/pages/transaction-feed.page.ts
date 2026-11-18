import type { Locator, Page } from "@playwright/test";

/** A date long after any data a run creates, so feeds filtered around it are empty. */
export const FUTURE = new Date("2030-01-15T12:00:00Z");

const feedPaths = { everyone: "/", friends: "/contacts", mine: "/personal" } as const;

const calendarDay = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export class TransactionFeedPage {
  readonly everyoneTab: Locator;
  readonly friendsTab: Locator;
  readonly mineTab: Locator;
  readonly transactions: Locator;
  readonly list: Locator;
  readonly emptyHeading: Locator;
  readonly createTransactionLink: Locator;
  readonly amountSlider: Locator;
  readonly clearButton: Locator;
  readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.everyoneTab = page.getByRole("tab", { name: "Everyone" });
    this.friendsTab = page.getByRole("tab", { name: "Friends" });
    this.mineTab = page.getByRole("tab", { name: "Mine" });
    this.transactions = page.getByRole("listitem");
    this.list = page.getByRole("grid");
    this.emptyHeading = page.getByRole("heading", { name: "No Transactions" });
    this.createTransactionLink = page.getByRole("link", { name: "Create A Transaction" });
    this.amountSlider = page.getByRole("slider").first();
    this.clearButton = page.getByRole("button", { name: "Clear", exact: true });
    this.closeButton = page.getByRole("button", { name: "Close", exact: true });
  }

  async goto(feed: keyof typeof feedPaths = "everyone") {
    await this.page.goto(feedPaths[feed]);
  }

  transaction(id: string) {
    return this.page.getByTestId(`transaction-item-${id}`);
  }

  dateFilter(range: string) {
    return this.page.getByRole("button", { name: `Date: ${range}` });
  }

  amountFilter(range: string) {
    return this.page.getByRole("button", { name: `Amount: ${range}` });
  }

  async pickDateRange(start: Date, end: Date) {
    await this.dateFilter("ALL").click();
    await this.page.getByRole("button", { name: calendarDay(start), exact: true }).click();
    await this.page.getByRole("button", { name: calendarDay(end), exact: true }).click();
  }

  /** ArrowRight on the amount slider raises the minimum by one $10 step. */
  async raiseMinimumAmount() {
    await this.amountFilter("$0 - $1,000").click();
    await this.amountSlider.focus();
    await this.page.keyboard.press("ArrowRight");
  }
}
