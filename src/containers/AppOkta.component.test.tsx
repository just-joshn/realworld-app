import type * as Provider from "@okta/okta-react";
import type { ComponentType } from "react";
import { expect, test, vi } from "vitest";
import { renderWithRouter } from "../../test/browser/render";
import { startProviderSession } from "../../test/browser/auth-providers-helpers";
import AppOkta from "./AppOkta";

const sdk = vi.hoisted(() => ({
  authenticated: { isAuthenticated: true, accessToken: { accessToken: "okta-token" } },
  signedOut: { isAuthenticated: false, accessToken: { accessToken: "okta-token" } },
  authState: vi.fn<() => { isAuthenticated: boolean; accessToken: { accessToken: string } }>(),
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({
        sub: "user1",
        email: "ada@example.com",
        given_name: "Ada",
        family_name: "Lovelace",
        preferred_username: "ada",
      })
    ),
    signOut: vi.fn(() => Promise.resolve(true)),
    setOriginalUri: vi.fn(),
    signInWithRedirect: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("@okta/okta-react", async (importOriginal) => {
  const original = await importOriginal<typeof Provider>();
  return {
    ...original,
    withOktaAuth: <P extends object>(Component: ComponentType<P>) => Component,
    useOktaAuth: () => ({
      authState: sdk.authState(),
      oktaAuth: sdk.auth,
    }),
    LoginCallback: () => <p>Completing Okta sign in</p>,
  };
});

test("shows the signed-in Okta user's name and username", async () => {
  sdk.authState.mockReturnValue(sdk.authenticated);
  startProviderSession();
  const screen = await renderWithRouter(<AppOkta />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByText("Ada L")).toBeVisible();
  await expect.element(screen.getByText("@ada")).toBeVisible();
});

test("sends a signed-out visitor to Okta sign-in", async () => {
  sdk.authState.mockReturnValue(sdk.signedOut);
  startProviderSession();
  const screen = await renderWithRouter(<AppOkta />);

  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
});

test("shows the provider callback while completing Okta sign-in", async () => {
  sdk.authState.mockReturnValue(sdk.signedOut);
  startProviderSession();
  const screen = await renderWithRouter(<AppOkta />, { route: "/implicit/callback" });

  await expect.element(screen.getByText("Completing Okta sign in")).toBeVisible();
});

test("removes the private app when the Okta user logs out", async () => {
  sdk.authState.mockReturnValue(sdk.authenticated);
  startProviderSession();
  const screen = await renderWithRouter(<AppOkta />, { route: "/notifications" });
  await screen.getByRole("button", { name: "open drawer" }).click();
  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
});
