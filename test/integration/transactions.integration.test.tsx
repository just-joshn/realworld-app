import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { history, mobile, renderSignedIn } from "./app";

const emptyMonth = new Date().toLocaleString("en-US", { month: "long" });
const emptyYear = new Date().getFullYear();

test("a user browses everyone's, friends', and their own transactions", async () => {
  const screen = await renderSignedIn();

  await expect.element(screen.getByText("Public", { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("listitem").first()).toBeVisible();

  await screen.getByRole("tab", { name: "Friends" }).click();
  await expect.element(screen.getByText("Contacts", { exact: true })).toBeVisible();
  await expect.poll(() => history.location.pathname).toBe("/contacts");
  await expect.element(screen.getByRole("listitem").first()).toBeVisible();

  await screen.getByRole("tab", { name: "Mine" }).click();
  await expect.element(screen.getByText("Personal", { exact: true })).toBeVisible();
  await expect.poll(() => history.location.pathname).toBe("/personal");
  await expect.element(screen.getByRole("listitem").first()).toBeVisible();

  await screen.getByRole("tab", { name: "Everyone" }).click();
  await expect.poll(() => history.location.pathname).toBe("/");
});

test("scrolling to the end of a feed loads the next page", async () => {
  const screen = await renderSignedIn({ route: "/personal" });
  const items = screen.getByRole("listitem");
  await expect.element(items.first()).toBeVisible();
  const firstPageCount = items.all().length;

  await screen.getByRole("grid").wheel({ delta: { y: 5000 } });

  await expect.poll(() => items.all().length).toBeGreaterThan(firstPageCount);
});

test("opening a transaction from the feed shows its details", async () => {
  const screen = await renderSignedIn({ route: "/personal" });
  const firstItem = screen.getByRole("listitem").first();
  await expect.element(firstItem).toBeVisible();

  await firstItem.click();

  await expect.element(screen.getByRole("heading", { name: "Transaction Detail" })).toBeVisible();
  await expect.poll(() => history.location.pathname).toMatch(/^\/transaction\/.+/);
  await expect.element(screen.getByRole("button", { name: "Like" })).toBeVisible();
});

test("filtering to a date range with no activity shows an empty feed until cleared", async () => {
  const screen = await renderSignedIn();
  await expect.element(screen.getByRole("listitem").first()).toBeVisible();

  await screen.getByRole("button", { name: "Date: ALL" }).click();
  await screen.getByRole("button", { name: `${emptyMonth} 1, ${emptyYear}`, exact: true }).click();
  await screen.getByRole("button", { name: `${emptyMonth} 10, ${emptyYear}`, exact: true }).click();

  await expect.element(screen.getByRole("heading", { name: "No Transactions" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: /Date: .* - / })).toBeVisible();

  await screen.getByTestId("CancelIcon").click();
  await expect.element(screen.getByRole("button", { name: "Date: ALL" })).toBeVisible();
  await expect.element(screen.getByRole("listitem").first()).toBeVisible();
});

test("an empty public feed offers to create a transaction", async () => {
  const screen = await renderSignedIn();
  await screen.getByRole("button", { name: "Date: ALL" }).click();
  await screen.getByRole("button", { name: `${emptyMonth} 1, ${emptyYear}`, exact: true }).click();
  await screen.getByRole("button", { name: `${emptyMonth} 2, ${emptyYear}`, exact: true }).click();
  await userEvent.keyboard("{Escape}");

  await screen.getByRole("link", { name: "Create A Transaction" }).click();

  await expect.poll(() => history.location.pathname).toBe("/transaction/new");
  await expect.element(screen.getByPlaceholder("Search...")).toBeVisible();
});

test("on a phone, a user filters by date in a full-screen picker", async () => {
  const screen = await renderSignedIn({ route: "/contacts", viewport: mobile });
  await expect.element(screen.getByRole("listitem").first()).toBeVisible();

  await screen.getByRole("button", { name: "Date: ALL" }).click();
  await screen.getByRole("button", { name: `${emptyMonth} 1, ${emptyYear}`, exact: true }).click();
  await screen.getByRole("button", { name: `${emptyMonth} 10, ${emptyYear}`, exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "No Transactions" })).toBeVisible();

  await screen.getByRole("button", { name: /Date: .* - / }).click();
  await screen.getByRole("button", { name: "Close", exact: true }).click();
  await screen.getByTestId("CancelIcon").click();
  await expect.element(screen.getByRole("listitem").first()).toBeVisible();
});

for (const viewport of [undefined, mobile]) {
  test(`a user narrows the feed by amount${viewport ? " on a phone" : ""}`, async () => {
    const screen = await renderSignedIn({ route: "/personal", viewport });
    await expect.element(screen.getByRole("listitem").first()).toBeVisible();

    await screen.getByRole("button", { name: "Amount: $0 - $1,000" }).click();
    const minAmount = screen.getByRole("slider").first();
    // The visually hidden range input needs a forced click, which skips Playwright's stability
    // check, so first wait for the filter to finish sliding on screen.
    await expect
      .poll(() => minAmount.element().getBoundingClientRect().bottom <= window.innerHeight)
      .toBe(true);
    await minAmount.click({ force: true });
    await userEvent.keyboard("{End}");

    await expect.element(screen.getByText("Amount Range: $1,000 - $1,000")).toBeVisible();
    // The open filter hides the rest of the page from the accessibility tree.
    await expect.element(screen.getByText("No Transactions")).toBeVisible();

    await screen.getByRole("button", { name: "Clear", exact: true }).click();
    if (viewport) await screen.getByRole("button", { name: "Close", exact: true }).click();
    else {
      await userEvent.tab();
      await userEvent.keyboard("{Escape}");
    }
    await expect.element(screen.getByRole("button", { name: "Amount: $0 - $1,000" })).toBeVisible();
    await expect.element(screen.getByRole("listitem").first()).toBeVisible();
  });
}
