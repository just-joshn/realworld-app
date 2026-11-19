import type { GoogleLoginProps, GoogleLoginResponse } from "@matheusluizn/react-google-login";
import { expect, test, vi } from "vitest";
import { renderWithRouter } from "../../test/browser/render";
import { startProviderSession } from "../../test/browser/auth-providers-helpers";
import AppGoogle from "./AppGoogle";

const sdk = vi.hoisted(() => ({ signedIn: false }));

vi.mock(import("@matheusluizn/react-google-login"), async (importOriginal) => {
  const original = await importOriginal();
  const React = await import("react");
  const tokenObj = {
    access_token: "google-token",
    id_token: "google-token",
    login_hint: "",
    scope: "",
    expires_in: 3600,
    first_issued_at: 0,
    expires_at: 3600000,
  };
  const response: GoogleLoginResponse = {
    tokenId: "google-token",
    profileObj: {
      googleId: "user1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      givenName: "Ada",
      familyName: "Lovelace",
      imageUrl: "",
    },
    googleId: "user1",
    accessToken: "google-token",
    tokenObj,
    getBasicProfile: () => ({
      getId: () => "user1",
      getEmail: () => "ada@example.com",
      getName: () => "Ada Lovelace",
      getGivenName: () => "Ada",
      getFamilyName: () => "Lovelace",
      getImageUrl: () => "",
    }),
    getAuthResponse: () => tokenObj,
    reloadAuthResponse: () => Promise.resolve(tokenObj),
    getGrantedScopes: () => "",
    getHostedDomain: () => "",
    getId: () => "user1",
    isSignedIn: () => true,
    hasGrantedScopes: () => true,
    disconnect: () => {},
    grantOfflineAccess: () => Promise.resolve({ code: "code" }),
    signIn: () => Promise.resolve(),
    grant: () => Promise.resolve(),
  };
  class GoogleLogin extends React.Component<GoogleLoginProps> {
    signIn() {
      this.props.onSuccess?.(response);
    }
    override render() {
      return (
        <button
          onClick={() => {
            this.signIn();
          }}
        >
          {this.props.buttonText}
        </button>
      );
    }
  }
  return {
    ...original,
    GoogleLogin,
    useGoogleLogin: ({ onSuccess }) => {
      React.useEffect(() => {
        if (sdk.signedIn) onSuccess?.(response);
      }, []);
      return { signIn: () => onSuccess?.(response), loaded: true };
    },
  };
});

test("offers Google Login to a signed-out user", async () => {
  sdk.signedIn = false;
  startProviderSession();
  const screen = await renderWithRouter(<AppGoogle />, { route: "/notifications" });

  await expect.element(screen.getByRole("button", { name: "Login" })).toBeVisible();
  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
});

test("shows the Google user's name when their existing session signs them in", async () => {
  sdk.signedIn = true;
  startProviderSession();
  const screen = await renderWithRouter(<AppGoogle />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByText("Ada L")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Login" })).not.toBeInTheDocument();
});

test("returns to Google Login when the user logs out", async () => {
  sdk.signedIn = true;
  startProviderSession();
  const screen = await renderWithRouter(<AppGoogle />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("button", { name: "Login" })).toBeVisible();
  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
});
