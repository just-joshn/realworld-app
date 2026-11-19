import React from "react";
import { styled } from "@mui/material/styles";
import { useSharedActor } from "../utils/useSharedActor";
import { Container, CssBaseline } from "@mui/material";

import { authService } from "../machines/authMachine";
import AlertBar from "../components/AlertBar";
import { useAppServices } from "./useAppServices";
import PrivateRoutesContainer from "./PrivateRoutesContainer";
import { GoogleLogin, useGoogleLogin } from "@matheusluizn/react-google-login";

const PREFIX = "AppGoogle";

const classes = {
  root: `${PREFIX}-root`,
  paper: `${PREFIX}-paper`,
};

const Root = styled("div")(({ theme }) => ({
  [`&.${classes.root}`]: {
    display: "flex",
  },

  [`& .${classes.paper}`]: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
}));

function useGoogleSync() {
  const clientId = process.env["VITE_GOOGLE_CLIENTID"];
  if (!clientId) {
    throw new Error("Missing VITE_GOOGLE_CLIENTID");
  }

  useGoogleLogin({
    clientId,
    onSuccess: (res) => {
      if (!("profileObj" in res)) {
        throw new Error("Missing Google profile in login response");
      }
      authService.send({
        type: "GOOGLE",
        user: res.profileObj,
        token: res.tokenId,
      });
    },
    cookiePolicy: "single_host_origin",
    isSignedIn: true,
  });
  return clientId;
}

const AppGoogle: React.FC = () => {
  const [authState] = useSharedActor(authService);
  const { notificationsService, snackbarService, bankAccountsService } = useAppServices();

  const clientId = useGoogleSync();

  const isLoggedIn = authState.matches("authorized");

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
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <div className={classes.paper}>
            <GoogleLogin
              clientId={clientId}
              buttonText="Login"
              cookiePolicy={"single_host_origin"}
            />
          </div>
        </Container>
      )}

      <AlertBar snackbarService={snackbarService} />
    </Root>
  );
};

export default AppGoogle;
