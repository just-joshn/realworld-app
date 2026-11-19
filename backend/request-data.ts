import * as yup from "yup";
import {
  DefaultPrivacyLevel,
  TransactionStatus,
  TransactionRequestStatus,
  NotificationsType,
  PaymentNotificationStatus,
} from "../src/models";

export const bankAccountBody = yup.object({
  bankName: yup.string().defined(),
  accountNumber: yup.string().defined(),
  routingNumber: yup.string().defined(),
});
export const userBody = yup.object({
  firstName: yup.string().default(""),
  lastName: yup.string().default(""),
  username: yup.string().default(""),
  password: yup.string().default(""),
  balance: yup.number().default(0),
  email: yup.string().default(""),
  phoneNumber: yup.string().default(""),
  avatar: yup.string().default(""),
  defaultPrivacyLevel: yup
    .mixed<DefaultPrivacyLevel>()
    .oneOf(Object.values(DefaultPrivacyLevel))
    .default(DefaultPrivacyLevel.public),
});
export const userPatchBody = userBody.shape({
  firstName: yup.string().optional(),
  lastName: yup.string().optional(),
  username: yup.string().optional(),
  password: yup.string().optional(),
  balance: yup.number().optional(),
  email: yup.string().optional(),
  phoneNumber: yup.string().optional(),
  avatar: yup.string().optional(),
  defaultPrivacyLevel: yup
    .mixed<DefaultPrivacyLevel>()
    .oneOf(Object.values(DefaultPrivacyLevel))
    .optional(),
});
export const transactionBody = yup.object({
  transactionType: yup.mixed<"payment" | "request">().oneOf(["payment", "request"]).defined(),
  source: yup.string().default(""),
  amount: yup.number().defined(),
  description: yup.string().defined(),
  receiverId: yup.string().defined(),
  senderId: yup.string().default(""),
  privacyLevel: yup
    .mixed<DefaultPrivacyLevel>()
    .oneOf(Object.values(DefaultPrivacyLevel))
    .optional(),
  status: yup
    .mixed<TransactionStatus>()
    .oneOf(Object.values(TransactionStatus))
    .default(TransactionStatus.pending),
});
export const transactionPatch = yup.object({
  requestStatus: yup
    .mixed<TransactionRequestStatus>()
    .oneOf(Object.values(TransactionRequestStatus))
    .defined(),
});
export const transactionQuery = yup.object({
  page: yup.number().default(1),
  limit: yup.number().default(10),
  status: yup.mixed<TransactionStatus>().oneOf(Object.values(TransactionStatus)).optional(),
  requestStatus: yup.string().optional(),
  senderId: yup.string().optional(),
  receiverId: yup.string().optional(),
  dateRangeStart: yup.string().optional(),
  dateRangeEnd: yup.string().optional(),
  amountMin: yup.number().optional(),
  amountMax: yup.number().optional(),
});
const notificationBase = {
  type: yup.mixed<NotificationsType>().oneOf(Object.values(NotificationsType)).defined(),
  transactionId: yup.string().defined(),
};
export const notificationPayload = yup.lazy((value: unknown) => {
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === NotificationsType.like
  )
    return yup.object({ ...notificationBase, likeId: yup.string().defined() });
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === NotificationsType.comment
  )
    return yup.object({ ...notificationBase, commentId: yup.string().defined() });
  return yup.object({
    ...notificationBase,
    status: yup
      .mixed<PaymentNotificationStatus>()
      .oneOf(Object.values(PaymentNotificationStatus))
      .defined(),
  });
});
export const notificationsBody = yup.object({ items: yup.array(notificationPayload).defined() });
export const notificationPatch = yup.object({ isRead: yup.boolean().defined() });
export const stringField = (input: unknown, key: string): string =>
  yup.object({ [key]: yup.string().defined() }).validateSync(input)[key] ?? "";
