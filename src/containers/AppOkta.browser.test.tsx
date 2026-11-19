import type * as Provider from "@okta/okta-react";
import type { ComponentType } from "react";
import { expect, test, vi } from "vitest";
import { renderWithRouter } from "../../test/browser/render";
import { startProviderSession } from "../../test/browser/auth-providers-helpers";
import AppOkta from "./AppOkta";

const sdk = vi.hoisted(() => ({
  state: { isAuthenticated: true, accessToken: { accessToken: "okta-token" } },
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
    useOktaAuth: vi.fn(() => ({
      authState: sdk.state,
      oktaAuth: sdk.auth,
    })),
    LoginCallback: () => <p>Completing Okta sign in</p>,
  };
});

test("shows the signed-in Okta user's name and username", async () => {
  sdk.state.isAuthenticated = true;
  startProviderSession();
  const screen = await renderWithRouter(<AppOkta />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByText("Ada L")).toBeVisible();
  await expect.element(screen.getByText("@ada")).toBeVisible();
});

test("sends a signed-out visitor to Okta sign-in", async () => {
  sdk.state.isAuthenticated = false;
  sdk.auth.signInWithRedirect.mockClear();
  startProviderSession();
  await renderWithRouter(<AppOkta />);

  await expect.poll(() => sdk.auth.signInWithRedirect.mock.calls.length).toBe(1);
  expect(sdk.auth.setOriginalUri).toHaveBeenCalledWith("/");
});

test("shows the provider callback while completing Okta sign-in", async () => {
  sdk.state.isAuthenticated = false;
  startProviderSession();
  const screen = await renderWithRouter(<AppOkta />, { route: "/implicit/callback" });

  await expect.element(screen.getByText("Completing Okta sign in")).toBeVisible();
});

test("removes the private app when the Okta user logs out", async () => {
  sdk.state.isAuthenticated = true;
  startProviderSession();
  const screen = await renderWithRouter(<AppOkta />, { route: "/notifications" });
  await screen.getByRole("button", { name: "open drawer" }).click();
  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
});

test("signs out of Okta when the user logs out", async () => {
  sdk.state.isAuthenticated = true;
  sdk.auth.signOut.mockClear();
  startProviderSession();
  const screen = await renderWithRouter(<AppOkta />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.poll(() => sdk.auth.signOut.mock.calls.length).toBe(1);
});
