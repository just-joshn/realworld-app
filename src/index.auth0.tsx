import { createRoot } from "react-dom/client";
import { Router } from "react-router-dom";
import { createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material";
import type { AppState } from "@auth0/auth0-react";
import { Auth0Provider } from "@auth0/auth0-react";
import AppAuth0 from "./containers/AppAuth0";
import { history } from "./utils/historyUtils";

const theme = createTheme({
  palette: {
    secondary: {
      main: "#fff",
    },
  },
});

const onRedirectCallback = (appState?: AppState) => {
  history.replace((appState && appState.returnTo) || window.location.pathname);
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing root element");
}
const root = createRoot(rootElement);

if (process.env["VITE_AUTH0"]) {
  const domain = process.env["VITE_AUTH0_DOMAIN"];
  const clientId = process.env["VITE_AUTH0_CLIENTID"];
  if (!domain || !clientId) {
    throw new Error("Missing VITE_AUTH0_DOMAIN or VITE_AUTH0_CLIENTID");
  }
  root.render(
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(process.env["VITE_AUTH0_AUDIENCE"]
          ? { audience: process.env["VITE_AUTH0_AUDIENCE"] }
          : {}),
        ...(process.env["VITE_AUTH0_SCOPE"] ? { scope: process.env["VITE_AUTH0_SCOPE"] } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      <Router history={history}>
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={theme}>
            <AppAuth0 />
          </ThemeProvider>
        </StyledEngineProvider>
      </Router>
    </Auth0Provider>
  );
} else {
  console.error("Auth0 is not configured.");
}
