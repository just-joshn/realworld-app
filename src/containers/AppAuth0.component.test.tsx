import type * as Provider from "@auth0/auth0-react";
import type { ComponentType } from "react";
import { expect, test, vi } from "vitest";
import { renderWithRouter } from "../../test/browser/render";
import { startProviderSession } from "../../test/browser/auth-providers-helpers";
import AppAuth0 from "./AppAuth0";

vi.mock("@auth0/auth0-react", async (importOriginal) => {
  const original = await importOriginal<typeof Provider>();
  return {
    ...original,
    withAuthenticationRequired: <P extends object>(Component: ComponentType<P>) => Component,
    useAuth0: vi.fn(() => ({
      isAuthenticated: true,
      user: { sub: "user1", email: "ada@example.com", nickname: "Ada" },
      getAccessTokenSilently: token,
      logout,
    })),
  };
});

const token = vi.hoisted(() => vi.fn(() => Promise.resolve("auth0-token")));
const logout = vi.hoisted(() => vi.fn(async () => {}));

test("shows the authenticated Auth0 user's profile in the app", async () => {
  startProviderSession();
  const screen = await renderWithRouter(<AppAuth0 />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByText("Ada")).toBeVisible();
  await expect.element(screen.getByRole("link", { name: "My Account" })).toBeVisible();
});

test("hides the private app when the Auth0 user logs out", async () => {
  startProviderSession();
  const screen = await renderWithRouter(<AppAuth0 />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
});
