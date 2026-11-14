import { createRoot } from "react-dom/client";
import { Router } from "react-router-dom";
import { createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material";

import AppCognito from "./containers/AppCognito";
import { history } from "./utils/historyUtils";

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

if (process.env["VITE_AWS_COGNITO"]) {
  root.render(
    <Router history={history}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <AppCognito />
        </ThemeProvider>
      </StyledEngineProvider>
    </Router>
  );
} else {
  console.error("Cognito is not configured.");
}
