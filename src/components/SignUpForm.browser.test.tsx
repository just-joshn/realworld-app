import { http, HttpResponse } from "msw";
import { expect, onTestFinished, test, vi } from "vitest";
import { interpret } from "xstate";
import { authMachine } from "../machines/authMachine";
import { apiUrl, worker } from "../../test/browser/msw";
import { history, renderWithRouter } from "../../test/browser/render";
import SignUpForm from "./SignUpForm";

function startAuth() {
  const service = interpret(authMachine).start();
  onTestFinished(() => {
    service.stop();
  });
  return service;
}

test("creates an account and takes the user to sign in", async () => {
  const received = vi.fn();
  worker.use(
    http.post(apiUrl("/users"), async ({ request }) => {
      received(await request.json());
      return HttpResponse.json({});
    })
  );
  const screen = await renderWithRouter(<SignUpForm authService={startAuth()} />, {
    route: "/signup",
  });
  for (const [label, value] of [
    ["First Name", "Ada"],
    ["Last Name", "Lovelace"],
    ["Username", "ada"],
    ["Password", "secret"],
    ["Confirm Password", "secret"],
  ]) {
    await screen.getByLabelText(new RegExp(`^${label}`)).fill(value);
  }
  await screen.getByRole("button", { name: "Sign Up" }).click();
  await expect.poll(() => history.location.pathname).toBe("/signin");
  expect(received).toHaveBeenCalledWith({
    firstName: "Ada",
    lastName: "Lovelace",
    username: "ada",
    password: "secret",
    confirmPassword: "secret",
  });
});

test("explains missing fields and mismatched passwords", async () => {
  const screen = await renderWithRouter(<SignUpForm authService={startAuth()} />);
  for (const label of ["First Name", "Last Name", "Username", "Password", "Confirm Password"]) {
    await screen.getByLabelText(new RegExp(`^${label}`)).click();
  }
  await screen.getByRole("heading", { name: "Sign Up" }).click();
  for (const message of [
    "First Name is required",
    "Last Name is required",
    "Username is required",
    "Enter your password",
    "Confirm your password",
  ]) {
    await expect.element(screen.getByText(message)).toBeVisible();
  }
  await screen.getByLabelText(/^Password/).fill("abc");
  await screen.getByLabelText(/^Confirm Password/).fill("different");
  await expect
    .element(screen.getByText("Password must contain at least 4 characters"))
    .toBeVisible();
  await expect.element(screen.getByText("Password does not match")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Sign Up" })).toBeDisabled();
});

test("links existing users to sign in", async () => {
  const screen = await renderWithRouter(<SignUpForm authService={startAuth()} />, {
    route: "/signup",
  });
  await screen.getByRole("link", { name: "Have an account? Sign In" }).click();
  await expect.poll(() => history.location.pathname).toBe("/signin");
});
