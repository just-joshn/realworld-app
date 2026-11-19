import React, { useEffect } from "react";
import { styled } from "@mui/material/styles";
import type { ActorRefFrom } from "xstate";
import { useSharedActor } from "../utils/useSharedActor";
import { Paper, Typography } from "@mui/material";
import type { NotificationUpdatePayload } from "../models";
import NotificationList from "../components/NotificationList";
import type { notificationsMachine } from "../machines/notificationsMachine";
import type { authMachine } from "../machines/authMachine";

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
  authService: ActorRefFrom<typeof authMachine>;
  notificationsService: ActorRefFrom<typeof notificationsMachine>;
}

const NotificationsContainer: React.FC<Props> = ({ authService, notificationsService }) => {
  const [authState] = useSharedActor(authService);
  const [notificationsState, sendNotifications] = useSharedActor(notificationsService);

  useEffect(() => {
    sendNotifications({ type: "FETCH" });
  }, [authState, sendNotifications]);

  const updateNotification = (payload: NotificationUpdatePayload) => {
    sendNotifications({ type: "UPDATE", ...payload });
  };

  return (
    <StyledPaper className={classes.paper}>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        Notifications
      </Typography>
      <NotificationList
        notifications={notificationsState.context.results}
        updateNotification={updateNotification}
      />
    </StyledPaper>
  );
};

export default NotificationsContainer;
