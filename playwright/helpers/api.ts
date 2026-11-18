import { expect, type APIRequestContext } from "@playwright/test";
import * as yup from "yup";
import { recordDelete } from "./cleanup";
import type { PrivacyLevel, TransactionType } from "./contracts";
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
  transactionType: TransactionType;
  receiverId: string;
  amount: number;
  description: string;
  privacyLevel?: PrivacyLevel;
};

export async function createUser(api: APIRequestContext, details: NewUser): Promise<TestUser> {
  const response = await api.post("/users", { data: details });
  expect(response.status()).toBe(201);
  const { user } = await readBody(response, yup.object({ user: userSchema.defined() }));
  return { ...user, password: details.password };
}

export async function deleteBankAccount(api: APIRequestContext, bankAccountId: string) {
  await expect(await api.delete(`/bankAccounts/${bankAccountId}`)).toBeOK();
}

export function scheduleBankAccountDelete(api: APIRequestContext, bankAccountId: string) {
  recordDelete(() => deleteBankAccount(api, bankAccountId));
}

export function scheduleBankAccountCreated(api: APIRequestContext, body: unknown) {
  const parsed = yup
    .object({ account: yup.object({ id: yup.string().defined() }).defined() })
    .validateSync(body, { strict: true });
  scheduleBankAccountDelete(api, parsed.account.id);
}

export async function createBankAccount(
  api: APIRequestContext,
  details: NewBankAccount,
  options?: { record?: boolean }
): Promise<ApiBankAccount> {
  const response = await api.post("/bankAccounts", { data: details });
  await expect(response).toBeOK();
  const account = (await readBody(response, yup.object({ account: bankAccountSchema.defined() })))
    .account;
  if (options?.record !== false) scheduleBankAccountDelete(api, account.id);
  return account;
}

export async function listBankAccountIds(api: APIRequestContext): Promise<string[]> {
  const response = await api.get("/bankAccounts");
  await expect(response).toBeOK();
  const { results } = await readBody(
    response,
    yup.object({
      results: yup.array(yup.object({ id: yup.string().defined() })).defined(),
    })
  );
  return results.map((account) => account.id);
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

export async function deleteContactIfPresent(api: APIRequestContext, contactId: string) {
  const owner = await getCurrentUser(api);
  const listed = await api.get(`/contacts/${owner.username}`);
  await expect(listed).toBeOK();
  const { contacts } = await readBody(
    listed,
    yup.object({ contacts: yup.array(contactSchema).defined() })
  );
  if (!contacts.some((contact) => contact.id === contactId)) return;
  await expect(await api.delete(`/contacts/${contactId}`)).toBeOK();
}

export function scheduleContactDelete(api: APIRequestContext, contactId: string) {
  recordDelete(() => deleteContactIfPresent(api, contactId));
}

export function scheduleContactCreated(api: APIRequestContext, body: unknown) {
  const parsed = yup
    .object({ contact: yup.object({ id: yup.string().defined() }).defined() })
    .validateSync(body, { strict: true });
  scheduleContactDelete(api, parsed.contact.id);
}

export async function addContact(
  api: APIRequestContext,
  contactUserId: string
): Promise<ApiContact> {
  const response = await api.post("/contacts", { data: { contactUserId } });
  await expect(response).toBeOK();
  const contact = (await readBody(response, yup.object({ contact: contactSchema.defined() })))
    .contact;
  scheduleContactDelete(api, contact.id);
  return contact;
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
