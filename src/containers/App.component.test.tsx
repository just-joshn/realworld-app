import { http, HttpResponse } from "msw";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { authService } from "../machines/authMachine";
import { buildBankAccount, buildUser } from "../../test/factories";
import { worker, apiUrl } from "../../test/browser/msw";
import { history, renderWithRouter } from "../../test/browser/render";
import App from "./App";

afterEach(async () => {
  worker.use(http.post(apiUrl("/logout"), () => HttpResponse.json({})));
  if (!authService.getSnapshot().matches("unauthorized")) {
    await new Promise<void>((resolve) => {
      const sub = authService.subscribe((state) => {
        if (state.matches("unauthorized")) {
          sub.unsubscribe();
          resolve();
        }
      });
      authService.send({ type: "LOGOUT" });
    });
  }
});

test("asks signed-out visitors to sign in", async () => {
  const screen = await renderWithRouter(<App />, { route: "/notifications" });
  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect.poll(() => history.location.pathname).toBe("/signin");
});

test("opens sign up from the sign in page", async () => {
  const screen = await renderWithRouter(<App />, { route: "/signin" });
  await screen.getByRole("link", { name: "Don't have an account? Sign Up" }).click();
  await expect.element(screen.getByRole("button", { name: "Sign Up" })).toBeVisible();
});

test("signs in and opens the notifications page", async () => {
  await page.viewport(1280, 900);
  worker.use(
    http.post(apiUrl("/login"), () => HttpResponse.json({ user: buildUser() })),
    http.get(apiUrl("/notifications"), () => HttpResponse.json({ results: [] })),
    http.post(apiUrl("/graphql"), () =>
      HttpResponse.json({ data: { listBankAccount: [buildBankAccount()] } })
    ),
    http.get(apiUrl("/transactions/public"), () =>
      HttpResponse.json({ results: [], pageData: { page: 1, totalPages: 1 } })
    )
  );
  const screen = await renderWithRouter(<App />, { route: "/signin" });
  await screen.getByLabelText("Username").fill("ada");
  await screen.getByLabelText("Password").fill("password");
  await screen.getByRole("button", { name: "Sign In" }).click();
  await screen.getByRole("link", { name: "Notifications", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expect.element(screen.getByText("No Notifications")).toBeVisible();
  await screen.getByRole("button", { name: "Logout" }).click();
  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeVisible();
});
