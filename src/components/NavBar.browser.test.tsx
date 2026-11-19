import { http, HttpResponse } from "msw";
import { expect, onTestFinished, test, vi } from "vitest";
import { page } from "vitest/browser";
import { createActor } from "xstate";
import { notificationsMachine } from "../machines/notificationsMachine";
import { buildLikeNotification } from "../../test/factories";
import { apiUrl, worker } from "../../test/browser/msw";
import { history, renderWithRouter } from "../../test/browser/render";
import NavBar from "./NavBar";

test("opens notifications with the unread count", async () => {
  await page.viewport(1280, 900);
  worker.use(
    http.get(apiUrl("/notifications"), () =>
      HttpResponse.json({ results: [{ ...buildLikeNotification(), userFullName: "Ada Lovelace" }] })
    )
  );
  const service = createActor(notificationsMachine).start();
  onTestFinished(() => {
    service.stop();
  });
  service.send({ type: "FETCH" });
  const screen = await renderWithRouter(
    <NavBar drawerOpen={false} toggleDrawer={vi.fn()} notificationsService={service} />
  );
  await expect.element(screen.getByRole("link", { name: "1 unread notifications" })).toBeVisible();
  await screen.getByRole("link", { name: "1 unread notifications" }).click();
  await expect.poll(() => history.location.pathname).toBe("/notifications");
});
