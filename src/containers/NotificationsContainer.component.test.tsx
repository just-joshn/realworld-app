import { http, HttpResponse } from "msw";
import { expect, onTestFinished, test, vi } from "vitest";
import { page } from "vitest/browser";
import { createActor } from "xstate";
import { authMachine } from "../machines/authMachine";
import { notificationsMachine } from "../machines/notificationsMachine";
import {
  buildCommentNotification,
  buildLikeNotification,
  buildPaymentNotification,
} from "../../test/factories";
import { apiUrl, worker } from "../../test/browser/msw";
import { renderWithRouter } from "../../test/browser/render";
import type { NotificationResponseItem } from "../models";
import { PaymentNotificationStatus } from "../models";
import NotificationsContainer from "./NotificationsContainer";

function services() {
  const authService = createActor(authMachine).start();
  const notificationsService = createActor(notificationsMachine).start();
  onTestFinished(() => {
    authService.stop();
    notificationsService.stop();
  });
  return { authService, notificationsService };
}

test("explains when there are no notifications", async () => {
  let requested = false;
  worker.use(
    http.get(apiUrl("/notifications"), () => {
      requested = true;
      return HttpResponse.json({ results: [] });
    })
  );
  const { authService, notificationsService } = services();
  const screen = await renderWithRouter(
    <NotificationsContainer authService={authService} notificationsService={notificationsService} />
  );
  // "No Notifications" also shows before the fetch starts. Wait for the request to be served so it
  // cannot outlive this test, where WebKit merges it with the next test's identical GET.
  await expect.poll(() => requested).toBe(true);
  await expect.element(screen.getByText("No Notifications")).toBeVisible();
});

for (const mobile of [false, true]) {
  test(`dismisses comments, likes and payments ${mobile ? "on mobile" : "on desktop"}`, async () => {
    await page.viewport(mobile ? 390 : 1280, 900);
    let results: NotificationResponseItem[] = [
      { ...buildCommentNotification(), userFullName: "Grace Hopper" },
      { ...buildLikeNotification(), userFullName: "Alan Turing" },
      { ...buildPaymentNotification(), userFullName: "Katherine Johnson" },
      {
        ...buildPaymentNotification({ id: "request", status: PaymentNotificationStatus.requested }),
        userFullName: "Dorothy Vaughan",
      },
    ];
    const received = vi.fn();
    worker.use(
      http.get(apiUrl("/notifications"), () => HttpResponse.json({ results })),
      http.patch(apiUrl("/notifications/:id"), async ({ request, params }) => {
        received(await request.json());
        results = results.filter((item) => item.id !== params["id"]);
        return HttpResponse.json({});
      })
    );
    const screen = await renderWithRouter(<NotificationsContainer {...services()} />);
    for (const text of [
      "Grace Hopper commented on a transaction.",
      "Alan Turing liked a transaction.",
      "Katherine Johnson received payment.",
      "Dorothy Vaughan requested payment.",
    ]) {
      await expect.element(screen.getByText(text)).toBeVisible();
      await screen
        .getByRole("listitem")
        .filter({ hasText: text })
        .getByRole("button", { name: mobile ? "mark as read" : "Dismiss" })
        .click();
      await expect.element(screen.getByText(text)).not.toBeInTheDocument();
    }
    await expect.element(screen.getByText("No Notifications")).toBeVisible();
    expect(received).toHaveBeenCalledWith({ id: "notif3", isRead: true });
    expect(received).toHaveBeenCalledTimes(4);
  });
}
