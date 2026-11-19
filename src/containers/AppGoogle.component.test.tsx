import type { GoogleLoginProps } from "@matheusluizn/react-google-login";
import { expect, test, vi } from "vitest";
import { renderWithRouter } from "../../test/browser/render";
import { startProviderSession } from "../../test/browser/auth-providers-helpers";
import AppGoogle from "./AppGoogle";

const sdk = vi.hoisted(() => ({ hasExistingSession: vi.fn(() => false) }));

vi.mock(import("@matheusluizn/react-google-login"), async (importOriginal) => {
  const original = await importOriginal();
  const React = await import("react");
  const { googleLoginResponse: response } = await import("./googleLoginFake");
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
        if (sdk.hasExistingSession()) onSuccess?.(response);
      }, []);
      return { signIn: () => onSuccess?.(response), loaded: true };
    },
  };
});

test("offers Google Login to a signed-out user", async () => {
  sdk.hasExistingSession.mockReturnValue(false);
  startProviderSession();
  const screen = await renderWithRouter(<AppGoogle />, { route: "/notifications" });

  await expect.element(screen.getByRole("button", { name: "Login" })).toBeVisible();
  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
});

test("shows the Google user's name when their existing session signs them in", async () => {
  sdk.hasExistingSession.mockReturnValue(true);
  startProviderSession();
  const screen = await renderWithRouter(<AppGoogle />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await expect.element(screen.getByText("Ada L")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Login" })).not.toBeInTheDocument();
});

test("returns to Google Login when the user logs out", async () => {
  sdk.hasExistingSession.mockReturnValue(true);
  startProviderSession();
  const screen = await renderWithRouter(<AppGoogle />, { route: "/notifications" });

  await screen.getByRole("button", { name: "open drawer" }).click();
  await screen.getByRole("button", { name: "Logout" }).click();

  await expect.element(screen.getByRole("button", { name: "Login" })).toBeVisible();
  await expect.element(screen.getByRole("link", { name: "My Account" })).not.toBeInTheDocument();
});
