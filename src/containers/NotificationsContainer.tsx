import React, { useEffect } from "react";
import { styled } from "@mui/material/styles";
import { InterpreterFrom } from "xstate";
import { useActor } from "@xstate/react";
import { Paper, Typography } from "@mui/material";
import { NotificationUpdatePayload } from "../models";
import NotificationList from "../components/NotificationList";
import { dataMachine } from "../machines/dataMachine";
import { authMachine } from "../machines/authMachine";

const PREFIX = "NotificationsContainer";

const classes = {
  paper: `${PREFIX}-paper`,
};

const StyledPaper = styled(Paper)(({ theme }) => ({
  [`&.${classes.paper}`]: {
    minHeight: "90vh",
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
}));

export interface Props {
  authService: InterpreterFrom<typeof authMachine>;
  notificationsService: InterpreterFrom<ReturnType<typeof dataMachine>>;
}

const NotificationsContainer: React.FC<Props> = ({ authService, notificationsService }) => {
  const [authState] = useActor(authService);
  const [notificationsState, sendNotifications] = useActor(notificationsService);

  useEffect(() => {
    sendNotifications({ type: "FETCH" });
  }, [authState, sendNotifications]);

  const updateNotification = (payload: NotificationUpdatePayload) =>
    sendNotifications({ type: "UPDATE", ...payload });

  const notifications = notificationsState.context.results;
  if (!notifications) {
    throw new Error("Missing notification results");
  }

  return (
    <StyledPaper className={classes.paper}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Notifications
      </Typography>
      <NotificationList notifications={notifications} updateNotification={updateNotification} />
    </StyledPaper>
  );
};

export default NotificationsContainer;
