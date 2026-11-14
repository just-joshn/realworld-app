import React from "react";
import { createRoot } from "react-dom/client";
import { Router, withRouter } from "react-router-dom";
import { createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material";

import { OktaAuth, toRelativeUrl } from "@okta/okta-auth-js";
import { Security } from "@okta/okta-react";
import { history } from "./utils/historyUtils";
import AppOkta from "./containers/AppOkta";

const theme = createTheme({
  palette: {
    secondary: {
      main: "#fff",
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing root element");
}
const root = createRoot(rootElement);

if (process.env["VITE_OKTA"]) {
  const domain = process.env["VITE_OKTA_DOMAIN"];
  const clientId = process.env["VITE_OKTA_CLIENTID"];
  if (!domain || !clientId) throw new Error("Missing VITE_OKTA_DOMAIN or VITE_OKTA_CLIENTID");
  const oktaAuth = new OktaAuth({
    issuer: `https://${domain}/oauth2/default`,
    clientId,
    redirectUri: window.location.origin + "/implicit/callback",
  });

  const AppWithRouter = withRouter(({ history }) => {
    const restoreOriginalUri: React.ComponentProps<typeof Security>["restoreOriginalUri"] = (
      _oktaAuth,
      originalUri
    ) => {
      history.replace(toRelativeUrl(originalUri || "/", window.location.origin));
    };

    return (
      <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
        <AppOkta />
      </Security>
    );
  });

  root.render(
    <Router history={history}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <AppWithRouter />
        </ThemeProvider>
      </StyledEngineProvider>
    </Router>
  );
} else {
  console.error("Okta is not configured.");
}
