import { expect, test, vi } from "vitest";
import { fetchAuthSession, signOut } from "aws-amplify/auth";
import { http, HttpResponse } from "msw";
import { apiUrl, worker } from "../../test/browser/msw";
import { renderWithRouter } from "../../test/browser/render";
import { startProviderSession } from "../../test/browser/auth-providers-helpers";
import AppCognito from "./AppCognito";

vi.mock(import("aws-amplify"), async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, Amplify: { ...original.Amplify, configure: vi.fn() } };
});

vi.mock(import("aws-amplify/auth"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    fetchAuthSession: vi.fn(),
    signOut: vi.fn(async () => {}),
    signInWithRedirect: vi.fn(async () => {
      window.history.replaceState(null, "", "/cognito-login");
    }),
  };
});

function signedInSession() {
  vi.mocked(fetchAuthSession).mockResolvedValue({});
  vi.mocked(fetchAuthSession).mockResolvedValueOnce({
    userSub: "user1",
    tokens: {
      accessToken: { payload: {}, toString: () => "cognito-token" },
      idToken: { payload: { email: "ada@example.com" }, toString: () => "id-token" },
    },
  });
}

test("opens the app for a user with a Cognito session", async () => {
  signedInSession();
  startProviderSession();
  const screen = await renderWithRouter(<AppCognito />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByRole("link", { name: "My Account" })).toBeVisible();
});

test("sends a signed-out user to Cognito sign-in", async () => {
  vi.mocked(fetchAuthSession).mockResolvedValue({});
  startProviderSession();
  await renderWithRouter(<AppCognito />);

  await expect.poll(() => window.location.pathname).toBe("/cognito-login");
});

test("signs out of Cognito even when the app logout request fails", async () => {
  vi.mocked(signOut).mockClear();
  signedInSession();
  startProviderSession();
  worker.use(http.post(apiUrl("/logout"), () => new HttpResponse(null, { status: 500 })));
  const screen = await renderWithRouter(<AppCognito />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
  await expect.poll(() => vi.mocked(signOut).mock.calls.length).toBeGreaterThan(0);
});

test("hides the private app when the Cognito user chooses Logout", async () => {
  signedInSession();
  startProviderSession();
  const screen = await renderWithRouter(<AppCognito />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
});
