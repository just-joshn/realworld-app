import React from "react";
import { styled } from "@mui/material/styles";
import { Paper, Typography, Grid } from "@mui/material";
import type { User, UserSettingsPayload } from "../models";
import UserSettingsForm from "../components/UserSettingsForm";
import type { ActorRefFrom } from "xstate";
import { isAppUser, type authMachine } from "../machines/authMachine";
import { useSharedActor } from "../utils/useSharedActor";
import PersonalSettingsIllustration from "../components/SvgUndrawPersonalSettingsKihd";

const PREFIX = "UserSettingsContainer";

const classes = {
  paper: `${PREFIX}-paper`,
};

const StyledPaper = styled(Paper)(({ theme }) => ({
  [`&.${classes.paper}`]: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
}));

export interface Props {
  authService: ActorRefFrom<typeof authMachine>;
}

const UserSettingsContainer: React.FC<Props> = ({ authService }) => {
  const [authState, sendAuth] = useSharedActor(authService);

  const currentUser =
    authState.context.user && isAppUser(authState.context.user)
      ? authState.context.user
      : undefined;
  const updateUser = (payload: UserSettingsPayload & Pick<User, "id">) => {
    sendAuth({ type: "UPDATE", ...payload });
  };

  return (
    <StyledPaper className={classes.paper}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        User Settings
      </Typography>
      <Grid
        container
        spacing={2}
        direction="row"
        sx={{ justifyContent: "flex-start", alignItems: "flex-start" }}
      >
        <Grid>
          <PersonalSettingsIllustration style={{ height: 200, width: 300 }} />
        </Grid>
        <Grid style={{ width: "50%" }}>
          {currentUser && <UserSettingsForm userProfile={currentUser} updateUser={updateUser} />}
        </Grid>
      </Grid>
    </StyledPaper>
  );
};
export default UserSettingsContainer;
