import React from "react";
import { createRoot } from "react-dom/client";
import { Router } from "react-router-dom";
import { createTheme, ThemeProvider, StyledEngineProvider, adaptV4Theme } from "@mui/material";

import AppGoogle from "./containers/AppGoogle";
import { history } from "./utils/historyUtils";

const theme = createTheme(
  adaptV4Theme({
    palette: {
      secondary: {
        main: "#fff",
      },
    },
  })
);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing root element");
}
const root = createRoot(rootElement);

if (process.env.VITE_GOOGLE) {
  root.render(
    <Router history={history}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <AppGoogle />
        </ThemeProvider>
      </StyledEngineProvider>
    </Router>
  );
} else {
  console.error("Google is not configured.");
}
