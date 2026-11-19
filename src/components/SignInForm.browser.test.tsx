import { http, HttpResponse } from "msw";
import { expect, onTestFinished, test } from "vitest";
import { createActor } from "xstate";
import { authMachine } from "../machines/authMachine";
import { buildUser } from "../../test/factories";
import { apiUrl, worker } from "../../test/browser/msw";
import { history, renderWithRouter } from "../../test/browser/render";
import SignInForm from "./SignInForm";

function startAuthService() {
  const service = createActor(authMachine).start();
  onTestFinished(() => {
    service.stop();
  });
  return service;
}

test("signs the user in with their username and password", async () => {
  const user = buildUser({ username: "ada" });
  worker.use(http.post(apiUrl("/login"), () => HttpResponse.json({ user })));
  const authService = startAuthService();
  const screen = await renderWithRouter(<SignInForm authService={authService} />, {
    route: "/signin",
  });

  await screen.getByLabelText("Username").fill("ada");
  await screen.getByLabelText("Password").fill("s3cret");
  await screen.getByRole("button", { name: "Sign In" }).click();

  await expect.poll(() => history.location.pathname).toBe("/");
});

test("shows an error when the credentials are rejected", async () => {
  worker.use(http.post(apiUrl("/login"), () => new HttpResponse(null, { status: 401 })));
  const screen = await renderWithRouter(<SignInForm authService={startAuthService()} />, {
    route: "/signin",
  });

  await screen.getByLabelText("Username").fill("ada");
  await screen.getByLabelText("Password").fill("wrong");
  await screen.getByRole("button", { name: "Sign In" }).click();

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("Username or password is invalid");
});

test("explains what is missing before the user can sign in", async () => {
  const screen = await renderWithRouter(<SignInForm authService={startAuthService()} />, {
    route: "/signin",
  });

  await screen.getByLabelText("Username").fill("ada");
  await screen.getByLabelText("Username").clear();
  await screen.getByLabelText("Password").fill("abc");
  await screen.getByLabelText("Username").click();

  await expect.element(screen.getByText("Username is required")).toBeVisible();
  await expect
    .element(screen.getByText("Password must contain at least 4 characters"))
    .toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Sign In" })).toBeDisabled();
});

test("links to sign up", async () => {
  const screen = await renderWithRouter(<SignInForm authService={startAuthService()} />, {
    route: "/signin",
  });

  await screen.getByRole("link", { name: "Don't have an account? Sign Up" }).click();

  await expect.poll(() => history.location.pathname).toBe("/signup");
});
