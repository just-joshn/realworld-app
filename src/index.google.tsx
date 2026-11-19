import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material";

import AppGoogle from "./containers/AppGoogle";
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

if (process.env["VITE_GOOGLE"]) {
  root.render(
    <HistoryRouter history={history}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <AppGoogle />
        </ThemeProvider>
      </StyledEngineProvider>
    </HistoryRouter>
  );
} else {
  console.error("Google is not configured.");
}
