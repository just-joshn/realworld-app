import { expect, test } from "vitest";
import { mobile, renderSignedIn } from "./app";

test("a user reads who liked, commented on, requested, and received their payments", async () => {
  const screen = await renderSignedIn();

  await screen.getByRole("link", { name: "Notifications", exact: true }).click();

  await expect.element(screen.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expect.element(screen.getByText(/ liked a transaction\.$/)).toBeVisible();
  await expect.element(screen.getByText(/ commented on a transaction\.$/)).toBeVisible();
  await expect.element(screen.getByText(/ requested payment\.$/).first()).toBeVisible();
  await expect.element(screen.getByText(/ received payment\.$/).first()).toBeVisible();
});

test("dismissing every notification leaves an empty inbox", async () => {
  const screen = await renderSignedIn({ route: "/notifications" });
  const dismiss = screen.getByRole("button", { name: "Dismiss" });
  await expect.element(dismiss.first()).toBeVisible();
  const total = dismiss.all().length;

  await dismiss.first().click();
  await expect.poll(() => dismiss.all().length).toBe(total - 1);
  while (dismiss.all().length > 0) {
    const remaining = dismiss.all().length;
    await dismiss.first().click();
    await expect.poll(() => dismiss.all().length).toBe(remaining - 1);
  }

  await expect.element(screen.getByRole("heading", { name: "No Notifications" })).toBeVisible();
});

test("on a phone, a user marks a notification as read", async () => {
  const screen = await renderSignedIn({ route: "/notifications", viewport: mobile });
  const markAsRead = screen.getByRole("button", { name: "mark as read" });
  await expect.element(markAsRead.first()).toBeVisible();
  const total = markAsRead.all().length;

  await markAsRead.first().click();

  await expect.poll(() => markAsRead.all().length).toBe(total - 1);
});
