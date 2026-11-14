import { expect, test } from "vitest";
import { history, renderWithRouter } from "../../test/browser/render";
import PrivateRoute from "./PrivateRoute";

test("redirects signed-out visitors to sign in", async () => {
  await renderWithRouter(
    <PrivateRoute isLoggedIn={false} path="/private">
      <h1>Private account</h1>
    </PrivateRoute>,
    { route: "/private" }
  );
  await expect.poll(() => history.location.pathname).toBe("/signin");
});

test("shows private content to signed-in visitors", async () => {
  const screen = await renderWithRouter(
    <PrivateRoute isLoggedIn path="/private">
      <h1>Private account</h1>
    </PrivateRoute>,
    { route: "/private" }
  );
  await expect.element(screen.getByRole("heading", { name: "Private account" })).toBeVisible();
});
