import { describe, expect, test, vi } from "vitest";
import { buildComment, buildLike, buildTransaction } from "../test/factories";
import { seedPeople } from "../test/database";
import { transactionQuery } from "./request-data";
import {
  DefaultPrivacyLevel,
  PaymentNotificationStatus,
  TransactionRequestStatus,
  TransactionStatus,
} from "../src/models";
import {
  createTransaction,
  getAllTransactions,
  getBankTransfersByUserId,
  getNotificationsByUserId,
  getPublicTransactionsByQuery,
  getPublicTransactionsDefaultSort,
  getTransactionById,
  getTransactionByIdForApi,
  getTransactionsByUserId,
  getTransactionsForUserContacts,
  getTransactionsForUserForApi,
  getUserById,
  transactionsWithinAmountRange,
  transactionsWithinDateRange,
  updateTransactionById,
} from "./database";

vi.mock(import("lowdb/adapters/FileSync"), async () => ({
  default: (await import("lowdb/adapters/Memory")).default,
}));

const at = (isoDate: string) => new Date(isoDate);

// txn1 Ada -> Grace, txn2 Grace -> Alan, txn3 Alan requests from Ada, txn4 Alan -> Alan.
function seedTransactions() {
  return seedPeople({
    transactions: [
      buildTransaction({
        id: "txn1",
        senderId: "user1",
        receiverId: "user2",
        amount: 2500,
        createdAt: at("2026-01-10"),
        modifiedAt: at("2026-01-10"),
      }),
      buildTransaction({
        id: "txn2",
        senderId: "user2",
        receiverId: "user3",
        amount: 1000,
        createdAt: at("2026-02-10"),
        modifiedAt: at("2026-02-10"),
      }),
      buildTransaction({
        id: "txn3",
        senderId: "user3",
        receiverId: "user1",
        amount: 5000,
        privacyLevel: DefaultPrivacyLevel.private,
        status: TransactionStatus.pending,
        requestStatus: TransactionRequestStatus.pending,
        createdAt: at("2026-03-10"),
        modifiedAt: at("2026-03-10"),
      }),
      buildTransaction({
        id: "txn4",
        senderId: "user3",
        receiverId: "user3",
        amount: 300,
        createdAt: at("2026-04-10"),
        modifiedAt: at("2026-04-10"),
      }),
    ],
    likes: [buildLike({ transactionId: "txn1" })],
    comments: [buildComment({ transactionId: "txn1" })],
  });
}

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("transaction API formatting", () => {
  test("getTransactionByIdForApi adds names, avatars, likes, and comments", () => {
    seedTransactions();

    expect(getTransactionByIdForApi("txn1")).toMatchObject({
      id: "txn1",
      senderName: "Ada Lovelace",
      receiverName: "Grace Hopper",
      senderAvatar: "https://example.com/ada.png",
      receiverAvatar: "https://example.com/grace.png",
      likes: [expect.objectContaining({ id: "like1" })],
      comments: [expect.objectContaining({ id: "comment1" })],
    });
  });
});

describe("getTransactionsForUserForApi", () => {
  test("returns the user's sent and received transactions, newest first", () => {
    seedTransactions();

    expect(ids(getTransactionsForUserForApi("user1"))).toEqual(["txn3", "txn1"]);
  });

  test("lists a transaction to oneself once", () => {
    seedTransactions();

    expect(ids(getTransactionsForUserForApi("user3"))).toEqual(["txn4", "txn3", "txn2"]);
  });

  test("filters by plain query fields", () => {
    seedTransactions();

    expect(ids(getTransactionsForUserForApi("user1", { status: "pending" }))).toEqual(["txn3"]);
  });

  test("filters by a date range", () => {
    seedTransactions();

    const query = { dateRangeStart: "2026-03-01", dateRangeEnd: "2026-03-31" };

    expect(ids(getTransactionsForUserForApi("user1", query))).toEqual(["txn3"]);
  });

  test("filters by an amount range", () => {
    seedTransactions();

    const query = { amountMin: 2000, amountMax: 3000 };

    expect(ids(getTransactionsForUserForApi("user1", query))).toEqual(["txn1"]);
  });
});

describe("range filters", () => {
  const transactions = [
    buildTransaction({ id: "small", amount: 100, createdAt: at("2026-01-01") }),
    buildTransaction({ id: "large", amount: 9000, createdAt: at("2026-06-01") }),
  ];

  test("transactionsWithinAmountRange ignores a half-open range", () => {
    expect(transactionsWithinAmountRange(undefined, 500, transactions)).toBe(transactions);
  });

  test.for([
    { amountMin: "0", amountMax: "1000", expected: ["small"] },
    { amountMin: "-100", amountMax: "0", expected: [] },
    { amountMin: "0", amountMax: "0", expected: [] },
  ])(
    "parsed bounds $amountMin to $amountMax still filter",
    ({ amountMin, amountMax, expected }) => {
      const query = transactionQuery.validateSync({ amountMin, amountMax });

      expect(
        ids(transactionsWithinAmountRange(query.amountMin, query.amountMax, transactions))
      ).toEqual(expected);
    }
  );

  test("transactionsWithinAmountRange keeps amounts in [min, max)", () => {
    expect(ids(transactionsWithinAmountRange(100, 9000, transactions))).toEqual(["small"]);
  });

  test("transactionsWithinDateRange ignores a half-open range", () => {
    expect(transactionsWithinDateRange("2026-01-01", undefined, transactions)).toBe(transactions);
  });

  test("transactionsWithinDateRange does not treat an invalid empty bound as absent", () => {
    expect(transactionsWithinDateRange("", "2026-07-01", transactions)).toEqual([]);
    expect(transactionsWithinDateRange("2026-01-01", "", transactions)).toEqual([]);
  });

  test("transactionsWithinDateRange keeps transactions created inside the range", () => {
    expect(ids(transactionsWithinDateRange("2026-05-01", "2026-07-01", transactions))).toEqual([
      "large",
    ]);
  });
});

describe("contact and public feeds", () => {
  test("getTransactionsForUserContacts returns the contacts' transactions", () => {
    seedTransactions();

    expect(ids(getTransactionsForUserContacts("user1"))).toEqual(["txn2", "txn1"]);
  });

  test("getPublicTransactionsDefaultSort splits contact and other public transactions", () => {
    seedTransactions();

    const { contactsTransactions, publicTransactions } = getPublicTransactionsDefaultSort("user1");

    expect(ids(contactsTransactions)).toEqual(["txn2", "txn1"]);
    expect(ids(publicTransactions)).toEqual(["txn4"]);
  });

  test("getPublicTransactionsByQuery without range filters matches the default sort", () => {
    seedTransactions();

    expect(getPublicTransactionsByQuery("user1", { page: 1, limit: 10 })).toEqual(
      getPublicTransactionsDefaultSort("user1")
    );
  });

  test("getPublicTransactionsByQuery applies range filters to both feeds", () => {
    seedTransactions();

    const { contactsTransactions, publicTransactions } = getPublicTransactionsByQuery("user1", {
      amountMin: 200,
      amountMax: 1500,
    });

    expect(ids(contactsTransactions)).toEqual(["txn2"]);
    expect(ids(publicTransactions)).toEqual(["txn4"]);
  });
});

describe("createTransaction", () => {
  const details = (overrides = {}) => ({
    source: "bank1",
    amount: 25,
    description: "Lunch",
    receiverId: "user2",
    senderId: "user1",
    status: TransactionStatus.pending,
    ...overrides,
  });

  test("a payment moves money from sender to receiver and completes", () => {
    seedPeople();

    const transaction = createTransaction("user1", "payment", details());

    expect(transaction).toMatchObject({
      amount: 2500,
      privacyLevel: DefaultPrivacyLevel.public,
    });
    expect(getTransactionById(transaction.id).status).toBe(TransactionStatus.complete);
    expect(getUserById("user1").balance).toBe(7500);
    expect(getUserById("user2").balance).toBe(7500);
    expect(getNotificationsByUserId("user2")).toEqual([
      expect.objectContaining({
        transactionId: transaction.id,
        status: PaymentNotificationStatus.received,
      }),
    ]);
  });

  test("a payment larger than the balance withdraws the shortfall from the bank", () => {
    seedPeople();

    const transaction = createTransaction(
      "user3",
      "payment",
      details({ receiverId: "user1", amount: 10 })
    );

    expect(getUserById("user3").balance).toBe(0);
    expect(getUserById("user1").balance).toBe(11000);
    expect(getBankTransfersByUserId("user3")).toEqual([
      expect.objectContaining({ amount: 1000, type: "withdrawal", transactionId: transaction.id }),
    ]);
  });

  test("a request stays pending, keeps balances, and notifies the payer", () => {
    seedPeople();

    const transaction = createTransaction(
      "user3",
      "request",
      details({ receiverId: "user1", privacyLevel: DefaultPrivacyLevel.contacts })
    );

    expect(transaction).toMatchObject({
      status: TransactionStatus.pending,
      requestStatus: TransactionRequestStatus.pending,
      privacyLevel: DefaultPrivacyLevel.contacts,
    });
    expect(getUserById("user1").balance).toBe(10000);
    expect(getNotificationsByUserId("user1")).toEqual([
      expect.objectContaining({ status: PaymentNotificationStatus.requested }),
    ]);
  });
});

describe("updateTransactionById", () => {
  test("accepting a request pays the requester and notifies them", () => {
    seedTransactions();

    updateTransactionById("txn3", { requestStatus: TransactionRequestStatus.accepted });

    expect(getTransactionById("txn3")).toMatchObject({
      status: TransactionStatus.complete,
      requestStatus: TransactionRequestStatus.accepted,
    });
    expect(getUserById("user1").balance).toBe(5000);
    expect(getUserById("user3").balance).toBe(5000);
    expect(getNotificationsByUserId("user3")).toEqual([
      expect.objectContaining({ status: PaymentNotificationStatus.received }),
    ]);
  });

  test("rejecting a request completes it without moving money", () => {
    seedTransactions();

    updateTransactionById("txn3", { requestStatus: TransactionRequestStatus.rejected });

    expect(getTransactionById("txn3").status).toBe(TransactionStatus.complete);
    expect(getUserById("user1").balance).toBe(10000);
    expect(getUserById("user3").balance).toBe(0);
  });

  test("editing a payment applies the edits as given", () => {
    seedTransactions();

    updateTransactionById("txn1", { description: "Dinner" });

    expect(getTransactionById("txn1")).toMatchObject({
      description: "Dinner",
      status: TransactionStatus.complete,
    });
    expect(getNotificationsByUserId("user1")).toEqual([]);
  });
});

test("getTransactionsByUserId returns the transactions the user received", () => {
  seedTransactions();

  expect(ids(getTransactionsByUserId("user3"))).toEqual(["txn2", "txn4"]);
  expect(getAllTransactions()).toHaveLength(4);
});
