import type { Locator, Page } from "@playwright/test";

export class TransactionDetailPage {
  readonly heading: Locator;
  readonly likeButton: Locator;
  readonly commentInput: Locator;
  readonly commentsHeading: Locator;
  readonly acceptButton: Locator;
  readonly rejectButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Transaction Detail" });
    this.likeButton = page.getByRole("button", { name: "Like" });
    this.commentInput = page.getByPlaceholder("Write a comment...");
    this.commentsHeading = page.getByRole("heading", { name: "Comments" });
    this.acceptButton = page.getByRole("button", { name: "Accept Request" });
    this.rejectButton = page.getByRole("button", { name: "Reject Request" });
  }

  async goto(transactionId: string) {
    await this.page.goto(`/transaction/${transactionId}`);
  }

  likeCount(transactionId: string) {
    return this.page.getByTestId(`transaction-like-count-${transactionId}`);
  }

  comment(text: string) {
    return this.page.getByRole("listitem").filter({ hasText: text });
  }

  async addComment(text: string) {
    await this.commentInput.fill(text);
    await this.commentInput.press("Enter");
  }
}
