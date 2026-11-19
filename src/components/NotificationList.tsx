import React from "react";
import { List } from "@mui/material";

import NotificationListItem from "./NotificationListItem";
import type { NotificationResponseItem } from "../models";
import EmptyList from "./EmptyList";
import remindersIllustration from "../svgs/undraw_reminders_697p.svg";

export interface NotificationsListProps {
  notifications: NotificationResponseItem[];
  updateNotification: React.ComponentProps<typeof NotificationListItem>["updateNotification"];
}

const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  updateNotification,
}) => {
  return (
    <>
      {notifications.length > 0 ? (
        <List data-test="notifications-list">
          {notifications.map((notification: NotificationResponseItem) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              updateNotification={updateNotification}
            />
          ))}
        </List>
      ) : (
        <EmptyList entity="Notifications">
          <img
            src={remindersIllustration}
            alt=""
            style={{ height: 200, width: 250, marginBottom: 30 }}
          />
        </EmptyList>
      )}
    </>
  );
};

export default NotificationsList;
