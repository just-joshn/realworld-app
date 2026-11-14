import { expect, test, vi } from "vitest";
import { renderWithRouter } from "../../test/browser/render";
import { startProviderSession } from "../../test/browser/auth-providers-helpers";
import AppOkta from "./AppOkta";

const sdk = vi.hoisted(() => ({
  state: { isAuthenticated: true, accessToken: "okta-token" },
  auth: {
    getUser: vi.fn(async () => ({
      sub: "user1",
      email: "ada@example.com",
      given_name: "Ada",
      family_name: "Lovelace",
      preferred_username: "ada",
    })),
  },
}));

vi.mock(import("@okta/okta-react"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    withOktaAuth: ((Component) => Component) as typeof original.withOktaAuth,
    useOktaAuth: vi.fn(() => ({
      authState: sdk.state,
      oktaAuth: sdk.auth,
    })) as unknown as typeof original.useOktaAuth,
    SecureRoute: () => <a href="/provider-login">Sign in with Okta</a>,
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

test("offers Okta sign-in when the user is signed out", async () => {
  sdk.state.isAuthenticated = false;
  startProviderSession();
  const screen = await renderWithRouter(<AppOkta />);

  await expect.element(screen.getByRole("link", { name: "Sign in with Okta" })).toBeVisible();
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
