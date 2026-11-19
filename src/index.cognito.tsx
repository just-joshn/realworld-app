import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material";

import AppCognito from "./containers/AppCognito";
import { history, HistoryRouter } from "./utils/historyUtils";

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
    <HistoryRouter history={history}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <AppCognito />
        </ThemeProvider>
      </StyledEngineProvider>
    </HistoryRouter>
  );
} else {
  console.error("Cognito is not configured.");
}
