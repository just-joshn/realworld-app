import { styled } from "@mui/material/styles";
import { Routes, Route, Navigate } from "react-router";
import { useSharedActor } from "../utils/useSharedActor";
import { CssBaseline } from "@mui/material";

import { authService } from "../machines/authMachine";
import AlertBar from "../components/AlertBar";
import SignInForm from "../components/SignInForm";
import SignUpForm from "../components/SignUpForm";
import PrivateRoutesContainer from "./PrivateRoutesContainer";
import { useAppServices } from "./useAppServices";

const PREFIX = "App";

const classes = {
  root: `${PREFIX}-root`,
};

const Root = styled("div")(() => ({
  [`&.${classes.root}`]: {
    display: "flex",
  },
}));

function App() {
  const [authState] = useSharedActor(authService);
  const { notificationsService, snackbarService, bankAccountsService } = useAppServices();

  const isLoggedIn =
    authState.matches("authorized") ||
    authState.matches("refreshing") ||
    authState.matches("updating");

  return (
    <Root className={classes.root}>
      <CssBaseline />

      {isLoggedIn && (
        <PrivateRoutesContainer
          isLoggedIn={isLoggedIn}
          notificationsService={notificationsService}
          authService={authService}
          snackbarService={snackbarService}
          bankAccountsService={bankAccountsService}
        />
      )}
      {authState.matches("unauthorized") && (
        <Routes>
          <Route path="/signup" element={<SignUpForm authService={authService} />} />
          <Route path="/signin" element={<SignInForm authService={authService} />} />
          <Route path="/*" element={<Navigate to="/signin" replace />} />
        </Routes>
      )}
      <AlertBar snackbarService={snackbarService} />
    </Root>
  );
}

export default App;
