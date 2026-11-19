import { Route, Routes } from "react-router";
import { expect, test } from "vitest";
import { history, renderWithRouter } from "../../test/browser/render";
import PrivateRoute from "./PrivateRoute";

test("redirects signed-out visitors to sign in", async () => {
  await renderWithRouter(
    <Routes>
      <Route
        path="/private"
        element={
          <PrivateRoute isLoggedIn={false}>
            <h1>Private account</h1>
          </PrivateRoute>
        }
      />
    </Routes>,
    { route: "/private" }
  );
  await expect.poll(() => history.location.pathname).toBe("/signin");
});

test("shows private content to signed-in visitors", async () => {
  const screen = await renderWithRouter(
    <Routes>
      <Route
        path="/private"
        element={
          <PrivateRoute isLoggedIn>
            <h1>Private account</h1>
          </PrivateRoute>
        }
      />
    </Routes>,
    { route: "/private" }
  );
  await expect.element(screen.getByRole("heading", { name: "Private account" })).toBeVisible();
});
