import type { Page } from "@playwright/test";

/** A date long after any data a run creates, so feeds filtered around it are empty. */
export const FUTURE = new Date("2030-01-15T12:00:00Z");

const calendarDay = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/** Opens the feed's date filter and picks a range on the calendar. */
export async function pickDateRange(page: Page, start: Date, end: Date) {
  await page.getByRole("button", { name: "Date: ALL" }).click();
  await page.getByRole("button", { name: calendarDay(start), exact: true }).click();
  await page.getByRole("button", { name: calendarDay(end), exact: true }).click();
}

/** Raises the feed's minimum amount by one $10 step. */
export async function raiseMinimumAmount(page: Page) {
  await page.getByRole("button", { name: "Amount: $0 - $1,000" }).click();
  await page.getByRole("slider").first().focus();
  await page.keyboard.press("ArrowRight");
}
