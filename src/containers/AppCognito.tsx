import { useEffect } from "react";
import { styled } from "@mui/material/styles";
import { useSharedActor } from "../utils/useSharedActor";
import { CssBaseline } from "@mui/material";

import { authService } from "../machines/authMachine";
import AlertBar from "../components/AlertBar";
import PrivateRoutesContainer from "./PrivateRoutesContainer";
import { useAppServices } from "./useAppServices";
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

type CognitoSession = Awaited<ReturnType<typeof fetchAuthSession>>;

function sendCognitoSession({ tokens, userSub }: CognitoSession) {
  if (!tokens?.idToken || !userSub) {
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
}

function useCognitoSignIn(isLoggedIn: boolean) {
  useEffect(() => {
    if (isLoggedIn) return;
    void fetchAuthSession().then((authSession) => {
      if (authSession.tokens) {
        sendCognitoSession(authSession);
      } else {
        void signInWithRedirect();
      }
    });
  }, [isLoggedIn]);
}

function useCognitoSignOut() {
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
}

function AppCognito() {
  const [authState] = useSharedActor(authService);
  const { notificationsService, snackbarService, bankAccountsService } = useAppServices();

  const isLoggedIn =
    authState.matches("authorized") ||
    authState.matches("refreshing") ||
    authState.matches("updating");

  useCognitoSignIn(isLoggedIn);
  useCognitoSignOut();

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
}

export default AppCognito;
