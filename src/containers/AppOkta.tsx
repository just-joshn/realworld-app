import React, { useEffect } from "react";
import { styled } from "@mui/material/styles";
import { useMachine } from "@xstate/react";
import { useSharedActor } from "../utils/useSharedActor";
import { CssBaseline } from "@mui/material";
import { LoginCallback, useOktaAuth, withOktaAuth } from "@okta/okta-react";
import { toRelativeUrl } from "@okta/okta-auth-js";
import { Route, Routes } from "react-router";

import { snackbarMachine } from "../machines/snackbarMachine";
import { notificationsMachine } from "../machines/notificationsMachine";
import { authService } from "../machines/authMachine";
import AlertBar from "../components/AlertBar";
import { bankAccountsMachine } from "../machines/bankAccountsMachine";
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

// okta-react's own SecureRoute only supports react-router 5, so this sends signed-out visitors to Okta.
function SecureRoute() {
  const { authState, oktaAuth } = useOktaAuth();

  useEffect(() => {
    if (authState && !authState.isAuthenticated) {
      oktaAuth.setOriginalUri(toRelativeUrl(window.location.href, window.location.origin));
      void oktaAuth.signInWithRedirect();
    }
  }, [authState, oktaAuth]);

  return null;
}

const AppOkta: React.FC = () => {
  const { authState: oktaAuthState, oktaAuth: oktaAuthService } = useOktaAuth();

  const [authState] = useSharedActor(authService);
  const [, , notificationsService] = useMachine(notificationsMachine);

  const [, , snackbarService] = useMachine(snackbarMachine);

  const [, , bankAccountsService] = useMachine(bankAccountsMachine);

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
