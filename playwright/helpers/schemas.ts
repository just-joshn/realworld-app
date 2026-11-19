import type { APIResponse } from "@playwright/test";
import * as yup from "yup";
import { transactionRequestStatuses, transactionStatuses } from "./contracts";

// Wire shapes the API sends back. Dates arrive as ISO strings, so these differ from src/models.

const text = () => yup.string().defined();

export const userSchema = yup.object({
  id: text(),
  uuid: text(),
  firstName: text(),
  lastName: text(),
  username: text(),
  password: text(),
  email: text(),
  phoneNumber: text(),
  balance: yup.number().defined(),
  avatar: yup.string(),
  defaultPrivacyLevel: yup.string(),
  createdAt: text(),
  modifiedAt: text(),
});

export const bankAccountSchema = yup.object({
  id: text(),
  uuid: text(),
  userId: text(),
  bankName: text(),
  accountNumber: text(),
  routingNumber: text(),
  isDeleted: yup.boolean().defined(),
  createdAt: text(),
  modifiedAt: text(),
});

const transactionFields = {
  id: text(),
  uuid: text(),
  senderId: text(),
  receiverId: text(),
  amount: yup.number().defined(),
  description: text(),
  status: yup.mixed<(typeof transactionStatuses)[number]>().oneOf(transactionStatuses).defined(),
  requestStatus: yup
    .mixed<(typeof transactionRequestStatuses)[number]>()
    .oneOf(transactionRequestStatuses),
  privacyLevel: yup.string(),
  createdAt: text(),
  modifiedAt: text(),
};

export const transactionSchema = yup.object(transactionFields);

export const likeSchema = yup.object({ id: text(), userId: text(), transactionId: text() });

export const commentSchema = yup.object({
  id: text(),
  userId: text(),
  transactionId: text(),
  content: text(),
});

export const transactionDetailSchema = yup.object({
  ...transactionFields,
  senderName: text(),
  receiverName: text(),
  likes: yup.array(likeSchema).defined(),
  comments: yup.array(commentSchema).defined(),
});

export const contactSchema = yup.object({
  id: text(),
  uuid: text(),
  userId: text(),
  contactUserId: text(),
});

export const notificationSchema = yup.object({
  id: text(),
  userId: text(),
  transactionId: text(),
  isRead: yup.boolean().defined(),
  userFullName: text(),
  status: yup.string(),
  likeId: yup.string(),
  commentId: yup.string(),
});

export const pageDataSchema = yup.object({
  page: yup.number().defined(),
  limit: yup.number().defined(),
  hasNextPages: yup.boolean().defined(),
  totalPages: yup.number().defined(),
});

export type ApiUser = yup.InferType<typeof userSchema>;
export type ApiBankAccount = yup.InferType<typeof bankAccountSchema>;
export type ApiTransaction = yup.InferType<typeof transactionSchema>;
export type ApiTransactionDetail = yup.InferType<typeof transactionDetailSchema>;
export type ApiContact = yup.InferType<typeof contactSchema>;
export type ApiNotification = yup.InferType<typeof notificationSchema>;

/** Reads a JSON body without trusting its shape. */
export async function readJson(response: APIResponse): Promise<unknown> {
  return response.json();
}

/** Reads a JSON body and checks it against `schema`, without coercing any value. */
export async function readBody<S extends yup.AnyObjectSchema>(
  response: APIResponse,
  schema: S
): Promise<yup.InferType<S>> {
  return schema.validate(await readJson(response), { strict: true, abortEarly: false });
}

export const validationErrorsSchema = yup.object({
  errors: yup
    .array(
      yup.object({ path: text(), msg: text(), location: text(), type: text(), value: yup.mixed() })
    )
    .defined(),
});

export const rowSchema = yup.object({ id: text(), uuid: text() });

/** `{ results: [...] }` where each row is only known to carry its ids. */
export const rowsSchema = yup.object({ results: yup.array(rowSchema).defined() });
