import { http, HttpResponse } from "msw";
import { expect, onTestFinished, test, vi } from "vitest";
import { page } from "vitest/browser";
import { interpret } from "xstate";
import { notificationsMachine } from "../machines/notificationsMachine";
import { buildLikeNotification } from "../../test/factories";
import { apiUrl, worker } from "../../test/browser/msw";
import { history, renderWithRouter } from "../../test/browser/render";
import NavBar from "./NavBar";

test("opens notifications with the unread count", async () => {
  await page.viewport(1280, 900);
  worker.use(
    http.get(apiUrl("/notifications"), () =>
      HttpResponse.json({ results: [buildLikeNotification()] })
    )
  );
  const service = interpret(notificationsMachine).start();
  onTestFinished(() => {
    service.stop();
  });
  service.send("FETCH");
  const screen = await renderWithRouter(
    <NavBar drawerOpen={false} toggleDrawer={vi.fn()} notificationsService={service} />
  );
  await expect.element(screen.getByRole("link", { name: "1", exact: true })).toBeVisible();
  await screen.getByRole("link", { name: "1", exact: true }).click();
  await expect.poll(() => history.location.pathname).toBe("/notifications");
});
