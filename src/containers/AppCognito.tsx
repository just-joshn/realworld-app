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
import { Amplify } from "aws-amplify";
import { fetchAuthSession, signInWithRedirect, signOut } from "aws-amplify/auth";

import awsConfig from "../aws-exports";
const PREFIX = "AppCognito";

const classes = {
  root: `${PREFIX}-root`,
};

const Root = styled("div")(() => ({
  [`&.${classes.root}`]: {
    display: "flex",
  },
}));

Amplify.configure(awsConfig);

const AppCognito: React.FC = () => {
  const [authState] = useSharedActor(authService);
  const [, , notificationsService] = useMachine(notificationsMachine);

  const [, , snackbarService] = useMachine(snackbarMachine);

  const [, , bankAccountsService] = useMachine(bankAccountsMachine);

  const isLoggedIn =
    authState.matches("authorized") ||
    authState.matches("refreshing") ||
    authState.matches("updating");

  useEffect(() => {
    if (!isLoggedIn) {
      void fetchAuthSession().then((authSession) => {
        if (authSession.tokens) {
          const { tokens, userSub } = authSession;
          if (!tokens.idToken || !userSub) {
            throw new Error("Missing Cognito session tokens or user subject");
          }
          const email = tokens.idToken.payload["email"];
          if (typeof email !== "string") {
            throw new Error("Missing Cognito email claim");
          }
          authService.send({
            type: "COGNITO",
            accessTokenJwtString: tokens.accessToken.toString(),
            userSub,
            email,
          });
        } else {
          void signInWithRedirect();
        }
      });
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const signOutOfCognito = () => {
      void signOut();
    };
    const subscriptions = [
      authService.on("LOGGED_OUT", signOutOfCognito),
      authService.on("LOGOUT_FAILED", signOutOfCognito),
    ];
    return () => {
      for (const subscription of subscriptions) subscription.unsubscribe();
    };
  }, []);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <Root className={classes.root}>
      <CssBaseline />

      <PrivateRoutesContainer
        isLoggedIn={true}
        notificationsService={notificationsService}
        authService={authService}
        snackbarService={snackbarService}
        bankAccountsService={bankAccountsService}
      />

      <AlertBar snackbarService={snackbarService} />
    </Root>
  );
};

export default AppCognito;
