import * as yup from "yup";
import { DefaultPrivacyLevel } from "./user";
import { TransactionStatus } from "./transaction";
import { PaymentNotificationStatus } from "./notification";

const timestamps = {
  createdAt: yup.date().required(),
  modifiedAt: yup.date().required(),
};
const identity = { id: yup.string().required(), uuid: yup.string().required(), ...timestamps };
const privacyLevel = yup
  .mixed<DefaultPrivacyLevel>()
  .oneOf(Object.values(DefaultPrivacyLevel))
  .required();

export const userSchema = yup
  .object({
    ...identity,
    firstName: yup.string().defined(),
    lastName: yup.string().defined(),
    username: yup.string().required(),
    password: yup.string().defined(),
    email: yup.string().defined(),
    phoneNumber: yup.string().defined(),
    balance: yup.number().required(),
    avatar: yup.string().defined(),
    defaultPrivacyLevel: privacyLevel,
  })
  .required();

const transactionReference = {
  ...identity,
  userId: yup.string().required(),
  transactionId: yup.string().required(),
};
const likeSchema = yup.object(transactionReference).required();
const commentSchema = yup
  .object({ ...transactionReference, content: yup.string().defined() })
  .required();

export const transactionSchema = yup
  .object({
    ...identity,
    source: yup.string().defined(),
    amount: yup.number().required(),
    description: yup.string().defined(),
    privacyLevel,
    receiverId: yup.string().required(),
    senderId: yup.string().required(),
    status: yup.mixed<TransactionStatus>().oneOf(Object.values(TransactionStatus)).required(),
    balanceAtCompletion: yup.number().optional(),
    requestStatus: yup.string().optional(),
    // Seeded requests that were never answered store an empty string here.
    requestResolvedAt: yup
      .date()
      .optional()
      .transform((value: Date | undefined, original: unknown) =>
        original === "" ? undefined : value
      ),
  })
  .required();

export const transactionResponseSchema = transactionSchema.shape({
  likes: yup.array(likeSchema).required(),
  comments: yup.array(commentSchema).required(),
  receiverName: yup.string().defined(),
  receiverAvatar: yup.string().defined(),
  senderName: yup.string().defined(),
  senderAvatar: yup.string().defined(),
});

export const bankAccountSchema = yup
  .object({
    ...identity,
    userId: yup.string().required(),
    bankName: yup.string().defined(),
    accountNumber: yup.string().required(),
    routingNumber: yup.string().required(),
    isDeleted: yup.boolean().required(),
  })
  .required();

const notificationBase = yup
  .object({
    ...transactionReference,
    isRead: yup.boolean().required(),
    userFullName: yup.string().defined(),
  })
  .required();
const paymentNotificationSchema = notificationBase.shape({
  status: yup
    .mixed<PaymentNotificationStatus>()
    .oneOf(Object.values(PaymentNotificationStatus))
    .required(),
});
const likeNotificationSchema = notificationBase.shape({ likeId: yup.string().required() });
const commentNotificationSchema = notificationBase.shape({ commentId: yup.string().required() });
export const notificationSchema = yup.lazy((value: unknown) => {
  if (typeof value === "object" && value !== null) {
    if ("likeId" in value) return likeNotificationSchema;
    if ("commentId" in value) return commentNotificationSchema;
  }
  return paymentNotificationSchema;
});

const paginationSchema = yup
  .object({
    page: yup.number().required(),
    limit: yup.number().required(),
    hasNextPages: yup.boolean().required(),
    totalPages: yup.number().required(),
  })
  .default(undefined);

export const usersResponseSchema = yup
  .object({ results: yup.array(userSchema).required() })
  .required();
export const transactionsResponseSchema = yup
  .object({
    results: yup.array(transactionResponseSchema).required(),
    pageData: paginationSchema,
  })
  .required();
export const notificationsResponseSchema = yup
  .object({ results: yup.array(notificationSchema).required() })
  .required();
export const bankAccountsResponseSchema = yup
  .object({
    data: yup.object({ listBankAccount: yup.array(bankAccountSchema).required() }).required(),
  })
  .required();
export const transactionDetailResponseSchema = yup
  .object({ transaction: transactionResponseSchema })
  .required();
export const identityProfileSchema = yup
  .object({
    id: yup.string().required(),
    email: yup.string().defined(),
    firstName: yup.string().optional(),
    lastName: yup.string().optional(),
    username: yup.string().optional(),
    avatar: yup.string().optional(),
  })
  .required();

export const authUserSchema = yup.lazy((value: unknown) =>
  typeof value === "object" && value !== null && "balance" in value
    ? userSchema
    : identityProfileSchema.optional().default(undefined)
);

export const authResponseSchema = yup
  .object({ user: userSchema.optional().default(undefined) })
  .required();
