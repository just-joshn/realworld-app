import { objectContaining } from "./test-matchers";
import { describe, expect, test, vi } from "vitest";
import fs from "fs";
import {
  buildBankAccount,
  buildComment,
  buildContact,
  buildDbState,
  buildLike,
  buildPaymentNotification,
  buildTransaction,
} from "../test/factories";
import { ada, alan, grace, resetDatabase, seedPeople } from "../test/database";
import { dispatch } from "../test/router";
import {
  createBankTransfer,
  getAllUsers,
  getBankAccountById,
  getCommentsByTransactionId,
  getContactsByUserId,
  getLikesByTransactionId,
  getNotificationById,
} from "./database";
import { BankTransferType } from "../src/models";
import bankAccountRoutes from "./bankaccount-routes";
import bankTransferRoutes from "./banktransfer-routes";
import commentRoutes from "./comment-routes";
import contactRoutes from "./contact-routes";
import likeRoutes from "./like-routes";
import notificationRoutes from "./notification-routes";
import testDataRoutes from "./testdata-routes";

vi.mock(import("lowdb/adapters/FileSync"), async () => ({
  default: (await import("lowdb/adapters/Memory")).default,
}));

const currentUser = { id: "user1" };
const shortId = "t45AiwidW";

describe("bank account routes", () => {
  test("GET / lists the user's bank accounts", async () => {
    resetDatabase({ bankaccounts: [buildBankAccount({ userId: "user1" })] });

    const { body } = await dispatch(bankAccountRoutes, {
      method: "GET",
      url: "/",
      user: currentUser,
    });

    expect(body).toEqual({ results: [objectContaining({ id: "bank1" })] });
  });

  test("GET /:bankAccountId returns the account", async () => {
    resetDatabase({ bankaccounts: [buildBankAccount({ id: shortId })] });

    const { body } = await dispatch(bankAccountRoutes, {
      method: "GET",
      url: `/${shortId}`,
      user: currentUser,
    });

    expect(body).toEqual({ account: objectContaining({ id: shortId }) });
  });

  test("POST / creates an account for the user", async () => {
    resetDatabase();

    const { body } = await dispatch(bankAccountRoutes, {
      method: "POST",
      url: "/",
      user: currentUser,
      body: { bankName: "First Bank", accountNumber: "123456789", routingNumber: "987654321" },
    });

    expect(body).toEqual({
      account: objectContaining({ userId: "user1", bankName: "First Bank" }),
    });
  });

  test("DELETE /:bankAccountId soft-deletes the account", async () => {
    resetDatabase({ bankaccounts: [buildBankAccount({ id: shortId })] });

    await dispatch(bankAccountRoutes, { method: "DELETE", url: `/${shortId}`, user: currentUser });

    expect(getBankAccountById(shortId).isDeleted).toBe(true);
  });
});

test("GET /bankTransfers lists the user's transfers", async () => {
  resetDatabase();
  createBankTransfer({
    userId: "user1",
    source: "bank1",
    amount: 100,
    transactionId: "txn1",
    type: BankTransferType.withdrawal,
  });

  const { body } = await dispatch(bankTransferRoutes, {
    method: "GET",
    url: "/",
    user: currentUser,
  });

  expect(body).toEqual({ transfers: [objectContaining({ amount: 100 })] });
});

describe("comment routes", () => {
  test("GET /:transactionId lists the comments", async () => {
    resetDatabase({ comments: [buildComment({ transactionId: shortId })] });

    const { body } = await dispatch(commentRoutes, {
      method: "GET",
      url: `/${shortId}`,
      user: currentUser,
    });

    expect(body).toEqual({ comments: [objectContaining({ content: "Nice!" })] });
  });

  test("POST /:transactionId adds a comment", async () => {
    seedPeople({ transactions: [buildTransaction({ id: shortId })] });

    const result = await dispatch(commentRoutes, {
      method: "POST",
      url: `/${shortId}`,
      user: currentUser,
      body: { content: "  Thanks!  " },
    });

    expect(result).toEqual({ status: 200 });
    expect(getCommentsByTransactionId(shortId)).toEqual([
      objectContaining({ userId: "user1", content: "Thanks!" }),
    ]);
  });
});

describe("like routes", () => {
  test("GET /:transactionId lists the likes", async () => {
    resetDatabase({ likes: [buildLike({ transactionId: shortId })] });

    const { body } = await dispatch(likeRoutes, {
      method: "GET",
      url: `/${shortId}`,
      user: currentUser,
    });

    expect(body).toEqual({ likes: [objectContaining({ id: "like1" })] });
  });

  test("POST /:transactionId adds a like", async () => {
    seedPeople({ transactions: [buildTransaction({ id: shortId })] });

    const result = await dispatch(likeRoutes, {
      method: "POST",
      url: `/${shortId}`,
      user: currentUser,
    });

    expect(result).toEqual({ status: 200 });
    expect(getLikesByTransactionId(shortId)).toEqual([objectContaining({ userId: "user1" })]);
  });
});

describe("contact routes", () => {
  test("GET /:username lists the user's contacts", async () => {
    seedPeople();

    const { body } = await dispatch(contactRoutes, { method: "GET", url: "/ada" });

    expect(body).toEqual({ contacts: [objectContaining({ contactUserId: "user2" })] });
  });

  test("POST / adds a contact", async () => {
    seedPeople();

    const { body } = await dispatch(contactRoutes, {
      method: "POST",
      url: "/",
      user: currentUser,
      body: { contactUserId: shortId },
    });

    expect(body).toEqual({ contact: objectContaining({ contactUserId: shortId }) });
  });

  test("DELETE /:contactId removes the contact", async () => {
    resetDatabase({ contacts: [buildContact({ id: shortId })] });

    await dispatch(contactRoutes, { method: "DELETE", url: `/${shortId}`, user: currentUser });

    expect(getContactsByUserId("user1")).toEqual([]);
  });
});

describe("notification routes", () => {
  test("GET / lists unread notifications", async () => {
    seedPeople({
      transactions: [buildTransaction({ id: "txn1" })],
      notifications: [buildPaymentNotification({ userId: "user1" })],
    });

    const { body } = await dispatch(notificationRoutes, {
      method: "GET",
      url: "/",
      user: currentUser,
    });

    expect(body).toEqual({
      results: [objectContaining({ id: "notif1", userFullName: "Ada Lovelace" })],
    });
  });

  test("POST /bulk creates notifications for the user", async () => {
    resetDatabase();

    const { body } = await dispatch(notificationRoutes, {
      method: "POST",
      url: "/bulk",
      user: currentUser,
      body: { items: [{ type: "like", transactionId: shortId, likeId: "like1" }] },
    });

    expect(body).toEqual({ results: [objectContaining({ userId: "user1" })] });
  });

  test.for([true, false])("PATCH /:notificationId sets isRead to %s", async (isRead) => {
    resetDatabase({ notifications: [buildPaymentNotification({ id: shortId, isRead: !isRead })] });

    const result = await dispatch(notificationRoutes, {
      method: "PATCH",
      url: `/${shortId}`,
      user: currentUser,
      body: { isRead: String(isRead) },
    });

    expect(result).toEqual({ status: 204 });
    expect(getNotificationById(shortId).isRead).toBe(isRead);
  });
});

describe("test data routes", () => {
  test("POST /seed reloads the seed data", async () => {
    resetDatabase();
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify(buildDbState({ users: [ada(), grace(), alan()] }))
    );

    const result = await dispatch(testDataRoutes, { method: "POST", url: "/seed" });

    expect(result).toEqual({ status: 200 });
    expect(getAllUsers()).toHaveLength(3);
  });

  test("GET /:entity returns the whole table", async () => {
    seedPeople();

    const { body } = await dispatch(testDataRoutes, { method: "GET", url: "/users" });

    expect(body).toEqual({ results: getAllUsers() });
  });

  test("GET /:entity rejects an unknown table", async () => {
    seedPeople();

    const { status } = await dispatch(testDataRoutes, { method: "GET", url: "/secrets" });

    expect(status).toBe(422);
  });
});
