import { expect, test, vi } from "vitest";
import { renderWithRouter } from "../../test/browser/render";
import { startProviderSession } from "../../test/browser/auth-providers-helpers";
import AppGoogle from "./AppGoogle";

const sdk = vi.hoisted(() => ({ signedIn: false }));

vi.mock(import("@matheusluizn/react-google-login"), async (importOriginal) => {
  const original = await importOriginal();
  const React = await import("react");
  const response = {
    tokenId: "google-token",
    profileObj: {
      googleId: "user1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      givenName: "Ada",
      familyName: "Lovelace",
      imageUrl: "",
    },
  } as import("@matheusluizn/react-google-login").GoogleLoginResponse;
  class GoogleLogin extends React.Component<
    import("@matheusluizn/react-google-login").GoogleLoginProps
  > {
    signIn() {
      this.props.onSuccess?.(response);
    }
    render() {
      return <button onClick={() => this.signIn()}>{this.props.buttonText}</button>;
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
