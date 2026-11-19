import { http, HttpResponse } from "msw";
import { expect, onTestFinished, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createActor } from "xstate";
import { authMachine } from "../machines/authMachine";
import { notificationsMachine } from "../machines/notificationsMachine";
import { buildUser } from "../../test/factories";
import { apiUrl, worker } from "../../test/browser/msw";
import { history, renderWithRouter } from "../../test/browser/render";
import { sendUntilAuthState } from "../containers/authStateTesting";
import MainLayout from "./MainLayout";

// page.viewport() can resolve before the iframe's media queries see the new width.
async function setMobileViewport() {
  await page.viewport(390, 900);
  await expect.poll(() => window.matchMedia("(max-width: 599.95px)").matches).toBe(true);
}

async function renderLayout(balance = 10000, loggedIn = true, route = "/") {
  const authService = createActor(authMachine).start();
  const notificationsService = createActor(notificationsMachine).start();
  onTestFinished(() => {
    authService.stop();
    notificationsService.stop();
  });
  worker.use(
    http.post(apiUrl("/login"), () => HttpResponse.json({ user: buildUser({ balance }) })),
    http.post(apiUrl("/logout"), () => HttpResponse.json({}))
  );
  if (loggedIn) {
    await sendUntilAuthState(authService, { type: "LOGIN" }, "authorized");
  }
  return renderWithRouter(
    <MainLayout authService={authService} notificationsService={notificationsService}>
      <h2>Your activity</h2>
    </MainLayout>,
    { route }
  );
}

const destinations = [
  { name: "My Account", route: "/user/settings" },
  { name: "Bank Accounts", route: "/bankaccounts" },
  { name: "Notifications", route: "/notifications" },
  { name: "Home", route: "/" },
];

test.for(destinations)("navigates to $name from the desktop drawer", async ({ name, route }) => {
  await page.viewport(1280, 900);
  const screen = await renderLayout(10000, true, "/somewhere");
  await expect.element(screen.getByText("@ada")).toBeVisible();
  await expect.element(screen.getByText("$100.00")).toBeVisible();

  await screen.getByRole("link", { name, exact: true }).click();

  await expect.poll(() => history.location.pathname).toBe(route);
});

test.for(destinations)(
  "navigates to $name from the mobile drawer and closes it",
  async ({ name, route }) => {
    await setMobileViewport();
    const screen = await renderLayout(0, true, "/somewhere");
    await screen.getByRole("button", { name: "open drawer" }).click();
    await expect.element(screen.getByText("$0.00")).toBeVisible();

    await screen.getByRole("link", { name, exact: true }).click();

    await expect.poll(() => history.location.pathname).toBe(route);
    await expect.element(screen.getByText("@ada")).not.toBeVisible();
  }
);

test("closes the mobile drawer when the user taps outside it", async () => {
  await setMobileViewport();
  const screen = await renderLayout();
  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByText("@ada")).toBeVisible();

  await userEvent.click(page.getByRole("presentation"), { position: { x: 380, y: 450 } });

  await expect.element(screen.getByText("@ada")).not.toBeVisible();
});

test("closes the mobile drawer with Escape", async () => {
  await setMobileViewport();
  const screen = await renderLayout();
  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByText("@ada")).toBeVisible();

  await userEvent.keyboard("{Escape}");

  await expect.element(screen.getByText("@ada")).not.toBeVisible();
});

test("signs out from the drawer", async () => {
  await page.viewport(1280, 900);
  const screen = await renderLayout();

  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByText("@ada")).not.toBeInTheDocument();
});

test("starts a new transaction from the navigation bar", async () => {
  await page.viewport(1280, 900);
  const screen = await renderLayout();
  await expect.element(screen.getByRole("tab", { name: "Everyone" })).toBeVisible();
  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByText("@ada")).not.toBeVisible();
  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByText("@ada")).toBeVisible();
  await screen.getByRole("link", { name: "New" }).click();
  await expect.poll(() => history.location.pathname).toBe("/transaction/new");
  await expect.element(screen.getByRole("tab", { name: "Everyone" })).not.toBeInTheDocument();
  await expect.element(screen.getByText("Built by")).toBeVisible();
});

test("shows the page without a profile when signed out", async () => {
  await page.viewport(1280, 900);
  const screen = await renderLayout(0, false);
  await expect.element(screen.getByRole("heading", { name: "Your activity" })).toBeVisible();
  await expect.element(screen.getByText("Account Balance")).not.toBeInTheDocument();
});
