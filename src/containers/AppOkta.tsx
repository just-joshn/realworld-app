import React, { useEffect } from "react";
import { styled } from "@mui/material/styles";
import { useSharedActor } from "../utils/useSharedActor";
import { CssBaseline } from "@mui/material";
import { LoginCallback, useOktaAuth, withOktaAuth } from "@okta/okta-react";
import { Route, Routes } from "react-router";

import { authService } from "../machines/authMachine";
import AlertBar from "../components/AlertBar";
import { useAppServices } from "./useAppServices";
import SecureRoute from "./SecureRoute";
import PrivateRoutesContainer from "./PrivateRoutesContainer";

const PREFIX = "appOkta";

const classes = {
  root: `${PREFIX}-root`,
};

const Root = styled("div")(() => ({
  [`&.${classes.root}`]: {
    display: "flex",
  },
}));

function useOktaSync() {
  const { authState: oktaAuthState, oktaAuth: oktaAuthService } = useOktaAuth();

  useEffect(() => {
    const token = oktaAuthState?.accessToken?.accessToken;
    if (oktaAuthState?.isAuthenticated && token !== undefined) {
      void oktaAuthService.getUser().then((user) => {
        authService.send({ type: "OKTA", user, token });
      });
    }
  }, [oktaAuthState, oktaAuthService]);

  useEffect(() => {
    const subscription = authService.on("LOGGED_OUT", () => {
      void oktaAuthService.signOut();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [oktaAuthService]);
}

const AppOkta: React.FC = () => {
  const [authState] = useSharedActor(authService);
  const { notificationsService, snackbarService, bankAccountsService } =
    useAppServices();

  useOktaSync();

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
          <Route path="/implicit/callback" element={<LoginCallback />} />
          <Route path="/" element={<SecureRoute />} />
        </Routes>
      )}

      <AlertBar snackbarService={snackbarService} />
    </Root>
  );
};

export default withOktaAuth(AppOkta);
