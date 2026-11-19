import { v4 } from "uuid";
import { orderBy } from "lodash/fp";
import shortid from "shortid";
import type {
  PaymentNotification,
  LikeNotification,
  CommentNotification,
  NotificationType,
  NotificationPayloadType,
  NotificationResponseItem,
} from "../../src/models";
import { PaymentNotificationStatus, NotificationsType } from "../../src/models";
import {
  isRequestTransaction,
  isLikeNotification,
  isCommentNotification,
} from "../../src/utils/transactionUtils";
import { required } from "../required";
import { NOTIFICATION_TABLE, db, getBy, insertRow, persist, select } from "./store";
import { getFullNameForUser } from "./users";
import { getTransactionById } from "./transactions";
import { getLikeById } from "./likes";
import { getCommentById } from "./comments";

export const getNotificationBy = (key: string, value: unknown): NotificationType =>
  required(getBy(NOTIFICATION_TABLE, key, value), "notification");

export const getNotificationsByObj = (query: object): NotificationType[] =>
  select(db.data.notifications, query);

export const getUnreadNotificationsByUserId = (userId: string) =>
  formatNotificationsForApiResponse(getNotificationsByObj({ userId, isRead: false }));

export const createPaymentNotification = (
  userId: string,
  transactionId: string,
  status: PaymentNotificationStatus
): PaymentNotification => {
  const notification: PaymentNotification = {
    id: shortid(),
    uuid: v4(),
    userId: userId,
    transactionId: transactionId,
    status,
    isRead: false,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  insertRow(NOTIFICATION_TABLE, notification);
  return notification;
};

export const createLikeNotification = (
  userId: string,
  transactionId: string,
  likeId: string
): LikeNotification => {
  const notification: LikeNotification = {
    id: shortid(),
    uuid: v4(),
    userId: userId,
    transactionId: transactionId,
    likeId: likeId,
    isRead: false,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  insertRow(NOTIFICATION_TABLE, notification);
  return notification;
};

export const createCommentNotification = (
  userId: string,
  transactionId: string,
  commentId: string
): CommentNotification => {
  const notification: CommentNotification = {
    id: shortid(),
    uuid: v4(),
    userId: userId,
    transactionId: transactionId,
    commentId: commentId,
    isRead: false,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  insertRow(NOTIFICATION_TABLE, notification);
  return notification;
};

export const createNotifications = (userId: string, notifications: NotificationPayloadType[]) =>
  notifications.flatMap((item: NotificationPayloadType) => {
    if ("status" in item && item.type === NotificationsType.payment) {
      return createPaymentNotification(userId, item.transactionId, item.status);
    } else if ("likeId" in item && item.type === NotificationsType.like) {
      return createLikeNotification(userId, item.transactionId, item.likeId);
    } else {
      if ("commentId" in item) {
        return createCommentNotification(userId, item.transactionId, item.commentId);
      }
    }
    return undefined;
  });

export const updateNotificationById = (
  _userId: string,
  notificationId: string,
  edits: Partial<NotificationType>
) => {
  getNotificationBy("id", notificationId);
  db.data = {
    ...db.data,
    notifications: db.data.notifications.map((row) =>
      row.id === notificationId ? { ...row, ...edits } : row
    ),
  };
  persist();
};

export const formatNotificationForApiResponse = (
  notification: NotificationType
): NotificationResponseItem => {
  let userFullName = getFullNameForUser(notification.userId);
  const transaction = required(getTransactionById(notification.transactionId), "transaction");

  if (isRequestTransaction(transaction)) {
    userFullName = getFullNameForUser(transaction.senderId);
  }

  if (isLikeNotification(notification)) {
    const like = getLikeById(notification.likeId);
    userFullName = getFullNameForUser(like.userId);
  }

  if (isCommentNotification(notification)) {
    const comment = getCommentById(notification.commentId);
    userFullName = getFullNameForUser(comment.userId);
  }

  return {
    userFullName,
    ...notification,
  };
};

export const formatNotificationsForApiResponse = (
  notifications: NotificationType[]
): NotificationResponseItem[] =>
  orderBy(
    [(notification: NotificationResponseItem) => new Date(notification.modifiedAt)],
    ["desc"],
    notifications.map((notification) => formatNotificationForApiResponse(notification))
  );
export const getNotificationById = (id: string): NotificationType => getNotificationBy("id", id);

export const getNotificationsByUserId = (userId: string) => getNotificationsByObj({ userId });
