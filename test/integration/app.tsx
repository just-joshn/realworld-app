import { createTheme, StyledEngineProvider, ThemeProvider } from "@mui/material";
import { Router } from "react-router-dom";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import App from "../../src/containers/App";
import { history } from "../../src/utils/historyUtils";

export { history };

export const SEEDED_PASSWORD = "s3cret";

export const seededUsers = {
  heath: { username: "Heath93", firstName: "Ted", lastName: "Parisian" },
  arvilla: { username: "Arvilla_Hegmann", firstName: "Kristian", lastName: "Bradtke" },
  lia: { username: "Judah_Dietrich50", firstName: "Lia", lastName: "Rosenbaum" },
};

export const desktop = { width: 1280, height: 900 };
export const mobile = { width: 390, height: 844 };

export async function renderApp({ route = "/", viewport = desktop } = {}) {
  await page.viewport(viewport.width, viewport.height);
  history.replace(route);
  return render(
    <Router history={history}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={createTheme()}>
          <App />
        </ThemeProvider>
      </StyledEngineProvider>
    </Router>
  );
}

type Screen = Awaited<ReturnType<typeof renderApp>>;

export async function signIn(screen: Screen, username: string = seededUsers.heath.username) {
  await screen.getByLabelText("Username").fill(username);
  await screen.getByLabelText("Password").fill(SEEDED_PASSWORD);
  await screen.getByRole("button", { name: "Sign In" }).click();
  // The navbar's "New" link renders once the user is signed in, on every screen size. Found by
  // text because the onboarding dialog hides the page behind it from the accessibility tree.
  await page.getByText("New", { exact: true }).findElement();
}

export async function renderSignedIn({
  username = seededUsers.heath.username,
  route = "/",
  viewport = desktop,
} = {}) {
  const screen = await renderApp({ route: "/signin", viewport });
  await signIn(screen, username);
  if (route !== "/") history.push(route);
  return screen;
}
