import { createRoot } from "react-dom/client";
import { createTheme, StyledEngineProvider } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import App from "./containers/App";
import { history, HistoryRouter } from "./utils/historyUtils";

const theme = createTheme({
  palette: {
    secondary: {
      main: "#fff",
    },
  },
  typography: {
    fontSize: 14 * 0.875,
    body1: {
      lineHeight: 1.43,
      letterSpacing: "0.01071em",
    },
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          padding: "6px 0 7px",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          padding: "6px 0 7px",
        },
      },
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing root element");
}
const root = createRoot(rootElement);

root.render(
  <HistoryRouter history={history}>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </HistoryRouter>
);
