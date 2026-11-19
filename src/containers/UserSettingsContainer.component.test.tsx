import { http, HttpResponse } from "msw";
import { expect, test, vi } from "vitest";
import { apiUrl, worker } from "../../test/browser/msw";
import { renderWithRouter } from "../../test/browser/render";
import { login, startAuth } from "../../test/browser/auth-settings-bank-helpers";
import { buildUser } from "../../test/factories";
import UserSettingsContainer from "./UserSettingsContainer";

test("shows settings without a form when signed out", async () => {
  const screen = await renderWithRouter(<UserSettingsContainer authService={startAuth()} />);
  await expect.element(screen.getByRole("heading", { name: "User Settings" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Save" })).not.toBeInTheDocument();
});

test("saves the signed-in user's changes", async () => {
  const received = vi.fn();
  worker.use(
    http.patch(apiUrl("/users/user1"), async ({ request }) => {
      received(await request.json());
      return HttpResponse.json({});
    }),
    http.get(apiUrl("/checkAuth"), () =>
      HttpResponse.json({ user: buildUser({ firstName: "Grace", phoneNumber: "5551234567" }) })
    )
  );
  const screen = await renderWithRouter(<UserSettingsContainer authService={await login()} />);
  await expect.element(screen.getByPlaceholder("First Name")).toHaveValue("Ada");
  await screen.getByPlaceholder("First Name").fill("Grace");
  await screen.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => received.mock.calls.length).toBe(1);
  expect(received).toHaveBeenCalledWith(
    expect.objectContaining({ id: "user1", firstName: "Grace" })
  );
  await expect.element(screen.getByPlaceholder("First Name")).toHaveValue("Grace");
});
