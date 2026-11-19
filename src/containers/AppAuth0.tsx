import React, { useEffect } from "react";
import { styled } from "@mui/material/styles";
import { useMachine } from "@xstate/react";
import { useSharedActor } from "../utils/useSharedActor";
import { CssBaseline } from "@mui/material";

import { snackbarMachine } from "../machines/snackbarMachine";
import { notificationsMachine } from "../machines/notificationsMachine";
import { authService } from "../machines/authMachine";
import AlertBar from "../components/AlertBar";
import { bankAccountsMachine } from "../machines/bankAccountsMachine";
import PrivateRoutesContainer from "./PrivateRoutesContainer";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";

const PREFIX = "appAuth0";

const classes = {
  root: `${PREFIX}-root`,
};

const Root = styled("div")(() => ({
  [`&.${classes.root}`]: {
    display: "flex",
  },
}));

const AppAuth0: React.FC = () => {
  const { isAuthenticated, user, getAccessTokenSilently, logout } = useAuth0();

  const [authState] = useSharedActor(authService);
  const [, , notificationsService] = useMachine(notificationsMachine);

  const [, , snackbarService] = useMachine(snackbarMachine);

  const [, , bankAccountsService] = useMachine(bankAccountsMachine);

  useEffect(() => {
    void (async function waitForToken() {
      const token = await getAccessTokenSilently();
      if (user !== undefined && token !== undefined)
        authService.send({ type: "AUTH0", user, token });
    })();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  useEffect(() => {
    const subscription = authService.on("LOGGED_OUT", () => {
      void logout({ logoutParams: { returnTo: window.location.origin } });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [logout]);

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

      <AlertBar snackbarService={snackbarService} />
    </Root>
  );
};

const appAuth0 = withAuthenticationRequired(AppAuth0);
export default appAuth0;
