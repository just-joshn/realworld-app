import * as yup from "yup";
import {
  DefaultPrivacyLevel,
  TransactionStatus,
  PaymentNotificationStatus,
  BankTransferType,
} from "../src/models";

const text = yup.string().defined();
const base = {
  id: text,
  uuid: text,
  createdAt: yup.date().defined(),
  modifiedAt: yup.date().defined(),
};
const privacy = yup
  .mixed<DefaultPrivacyLevel>()
  .oneOf(Object.values(DefaultPrivacyLevel))
  .defined();
const user = yup.object({
  ...base,
  firstName: text,
  lastName: text,
  username: text,
  password: text,
  email: text,
  phoneNumber: text,
  balance: yup.number().defined(),
  avatar: text,
  defaultPrivacyLevel: privacy,
});
const contact = yup.object({ ...base, userId: text, contactUserId: text });
const bankAccount = yup.object({
  ...base,
  userId: text,
  bankName: text,
  accountNumber: text,
  routingNumber: text,
  isDeleted: yup.boolean().defined(),
});
const transaction = yup.object({
  ...base,
  source: text,
  amount: yup.number().defined(),
  description: text,
  privacyLevel: privacy,
  receiverId: text,
  senderId: text,
  status: yup
    .mixed<TransactionStatus>()
    .oneOf(Object.values(TransactionStatus))
    .defined(),
  balanceAtCompletion: yup.number(),
  requestStatus: yup.string(),
  requestResolvedAt: yup
    .mixed<Date | string>()
    .test(
      "resolved-date",
      "Invalid request resolution date",
      (value: unknown) =>
        value === undefined ||
        typeof value === "string" ||
        value instanceof Date,
    ),
});
const like = yup.object({ ...base, userId: text, transactionId: text });
const comment = like.shape({ content: text });
const notificationBase = {
  ...base,
  userId: text,
  transactionId: text,
  isRead: yup.boolean().defined(),
};
const notification = yup.lazy((value: unknown) => {
  if (typeof value === "object" && value !== null && "likeId" in value)
    return yup.object({ ...notificationBase, likeId: text });
  if (typeof value === "object" && value !== null && "commentId" in value)
    return yup.object({ ...notificationBase, commentId: text });
  return yup.object({
    ...notificationBase,
    status: yup
      .mixed<PaymentNotificationStatus>()
      .oneOf(Object.values(PaymentNotificationStatus))
      .defined(),
  });
});
const transfer = yup.object({
  ...base,
  userId: text,
  source: text,
  amount: yup.number().defined(),
  transactionId: text,
  type: yup
    .mixed<BankTransferType>()
    .oneOf(Object.values(BankTransferType))
    .defined(),
});
export const databaseSchema = yup.object({
  users: yup.array(user).defined(),
  contacts: yup.array(contact).defined(),
  bankaccounts: yup.array(bankAccount).defined(),
  transactions: yup.array(transaction).defined(),
  likes: yup.array(like).defined(),
  comments: yup.array(comment).defined(),
  notifications: yup.array(notification).defined(),
  banktransfers: yup.array(transfer).defined(),
});
