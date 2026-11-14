import React from "react";
import { styled } from "@mui/material/styles";
import { Paper, Typography, Grid } from "@mui/material";
import { User, UserSettingsPayload } from "../models";
import UserSettingsForm from "../components/UserSettingsForm";
import { InterpreterFrom } from "xstate";
import { authMachine } from "../machines/authMachine";
import { useActor } from "@xstate/react";
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
  authService: InterpreterFrom<typeof authMachine>;
}

const UserSettingsContainer: React.FC<Props> = ({ authService }) => {
  const [authState, sendAuth] = useActor(authService);

  const currentUser = authState?.context?.user;
  const updateUser = (payload: UserSettingsPayload & Pick<User, "id">) =>
    sendAuth({ type: "UPDATE", ...payload });

  return (
    <StyledPaper className={classes.paper}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        User Settings
      </Typography>
      <Grid
        container
        spacing={2}
        direction="row"
        justifyContent="flex-start"
        alignItems="flex-start"
      >
        <Grid item>
          <PersonalSettingsIllustration style={{ height: 200, width: 300 }} />
        </Grid>
        <Grid item style={{ width: "50%" }}>
          {currentUser && <UserSettingsForm userProfile={currentUser} updateUser={updateUser} />}
        </Grid>
      </Grid>
    </StyledPaper>
  );
};
export default UserSettingsContainer;
