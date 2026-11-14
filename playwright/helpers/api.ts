import { expect, type APIRequestContext } from "@playwright/test";
import * as yup from "yup";
import type { NewBankAccount, NewUser, TestUser } from "./data";
import {
  bankAccountSchema,
  contactSchema,
  notificationSchema,
  readBody,
  transactionDetailSchema,
  transactionSchema,
  userSchema,
  type ApiBankAccount,
  type ApiContact,
  type ApiNotification,
  type ApiTransaction,
  type ApiTransactionDetail,
  type ApiUser,
} from "./schemas";

export type NewTransaction = {
  transactionType: "payment" | "request";
  receiverId: string;
  amount: number;
  description: string;
  privacyLevel?: "public" | "private" | "contacts";
};

export async function createUser(api: APIRequestContext, details: NewUser): Promise<TestUser> {
  const response = await api.post("/users", { data: details });
  expect(response.status()).toBe(201);
  const { user } = await readBody(response, yup.object({ user: userSchema.defined() }));
  return { ...user, password: details.password };
}

export async function createBankAccount(
  api: APIRequestContext,
  details: NewBankAccount
): Promise<ApiBankAccount> {
  const response = await api.post("/bankAccounts", { data: details });
  await expect(response).toBeOK();
  return (await readBody(response, yup.object({ account: bankAccountSchema.defined() }))).account;
}

export async function createTransaction(
  api: APIRequestContext,
  details: NewTransaction
): Promise<ApiTransaction> {
  const response = await api.post("/transactions", { data: details });
  await expect(response).toBeOK();
  return (await readBody(response, yup.object({ transaction: transactionSchema.defined() })))
    .transaction;
}

export async function getTransaction(
  api: APIRequestContext,
  transactionId: string
): Promise<ApiTransactionDetail> {
  const response = await api.get(`/transactions/${transactionId}`);
  await expect(response).toBeOK();
  return (await readBody(response, yup.object({ transaction: transactionDetailSchema.defined() })))
    .transaction;
}

export async function addContact(
  api: APIRequestContext,
  contactUserId: string
): Promise<ApiContact> {
  const response = await api.post("/contacts", { data: { contactUserId } });
  await expect(response).toBeOK();
  return (await readBody(response, yup.object({ contact: contactSchema.defined() }))).contact;
}

export async function likeTransaction(api: APIRequestContext, transactionId: string) {
  await expect(await api.post(`/likes/${transactionId}`)).toBeOK();
}

export async function commentOnTransaction(
  api: APIRequestContext,
  transactionId: string,
  content: string
) {
  await expect(await api.post(`/comments/${transactionId}`, { data: { content } })).toBeOK();
}

export async function getCurrentUser(api: APIRequestContext): Promise<ApiUser> {
  const response = await api.get("/checkAuth");
  await expect(response).toBeOK();
  return (await readBody(response, yup.object({ user: userSchema.defined() }))).user;
}

export async function getUnreadNotifications(api: APIRequestContext): Promise<ApiNotification[]> {
  const response = await api.get("/notifications");
  await expect(response).toBeOK();
  return (
    await readBody(response, yup.object({ results: yup.array(notificationSchema).defined() }))
  ).results;
}
