import React from "react";
import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material";

import { OktaAuth, toRelativeUrl } from "@okta/okta-auth-js";
import { Security } from "@okta/okta-react";
import { history, HistoryRouter } from "./utils/historyUtils";
import AppOkta from "./containers/AppOkta";
import { oktaIssuer } from "./utils/apiConfig";

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
    issuer: oktaIssuer(domain),
    clientId,
    redirectUri: window.location.origin + "/implicit/callback",
  });

  const restoreOriginalUri: React.ComponentProps<typeof Security>["restoreOriginalUri"] = (
    _oktaAuth,
    originalUri
  ) => {
    history.replace(toRelativeUrl(originalUri || "/", window.location.origin));
  };

  root.render(
    <HistoryRouter history={history}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
            <AppOkta />
          </Security>
        </ThemeProvider>
      </StyledEngineProvider>
    </HistoryRouter>
  );
} else {
  console.error("Okta is not configured.");
}
