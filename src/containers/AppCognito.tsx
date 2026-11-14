import React, { useEffect } from "react";
import { styled } from "@mui/material/styles";
import { useActor, useMachine } from "@xstate/react";
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
  const [authState] = useActor(authService);
  const [, , notificationsService] = useMachine(notificationsMachine);

  const [, , snackbarService] = useMachine(snackbarMachine);

  const [, , bankAccountsService] = useMachine(bankAccountsMachine);

  const isLoggedIn =
    authState.matches("authorized") ||
    authState.matches("refreshing") ||
    authState.matches("updating");

  useEffect(() => {
    if (!isLoggedIn) {
      fetchAuthSession().then((authSession) => {
        if (authSession && authSession.tokens && authSession.tokens.accessToken) {
          const { tokens, userSub } = authSession;
          if (!tokens.idToken || !userSub) {
            throw new Error("Missing Cognito session tokens or user subject");
          }
          authService.send("COGNITO", {
            accessTokenJwtString: tokens.accessToken.toString(),
            userSub,
            email: tokens.idToken.payload.email,
          });
        } else {
          void signInWithRedirect();
        }
      });
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const signOutOfCognito = async (event: { type: string }) => {
      if (
        event.type.startsWith("done.invoke.authentication.logout") ||
        event.type.startsWith("error.platform.authentication.logout")
      ) {
        await signOut();
      }
    };
    authService.onEvent(signOutOfCognito);
    return () => {
      authService.off(signOutOfCognito);
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
