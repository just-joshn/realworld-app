import { objectContaining } from "./test-matchers";
import * as yup from "yup";
import { describe, expect, test } from "vitest";
import { buildTransaction } from "../test/factories";
import { seedPeople } from "../test/database";
import { dispatch } from "../test/router";
import { DefaultPrivacyLevel, TransactionRequestStatus, TransactionStatus } from "../src/models";
import { getTransactionById, getUserById } from "./database";
import router from "./transaction-routes";
import { required } from "./required";

const ada = { id: "user1" };

// Ada's contact Grace has six public transactions with Alan, Alan pays himself publicly once,
// and Alan privately requests money from Ada.
function seedFeed() {
  const contactTransactions = Array.from({ length: 6 }, (_, index) =>
    buildTransaction({
      id: `contact${String(index)}`,
      senderId: "user2",
      receiverId: "user3",
      modifiedAt: new Date(2026, 0, index + 1),
    })
  );
  return seedPeople({
    transactions: [
      ...contactTransactions,
      buildTransaction({ id: "public1", senderId: "user3", receiverId: "user3" }),
      buildTransaction({
        id: "request1",
        senderId: "user3",
        receiverId: "user1",
        privacyLevel: DefaultPrivacyLevel.private,
        status: TransactionStatus.pending,
        requestStatus: TransactionRequestStatus.pending,
      }),
    ],
  });
}

const resultIds = (body: unknown) =>
  yup
    .object({ results: yup.array(yup.object({ id: yup.string().defined() })).defined() })
    .validateSync(body)
    .results.map((item) => item.id);

test("rejects unauthenticated requests", async () => {
  seedFeed();

  await expect(dispatch(router, { method: "GET", url: "/" })).resolves.toEqual({
    status: 401,
    body: { error: "Unauthorized" },
  });
});

describe("GET /", () => {
  test("filters a string amount range whose lower bound is zero", async () => {
    seedPeople({
      transactions: [
        buildTransaction({ id: "small", amount: 100 }),
        buildTransaction({ id: "large", amount: 5000 }),
      ],
    });

    const { body } = await dispatch(router, {
      method: "GET",
      url: "/",
      user: ada,
      query: { amountMin: "0", amountMax: "1000" },
    });

    expect(resultIds(body)).toEqual(["small"]);
  });

  test("returns a page of the user's transactions with page data", async () => {
    seedFeed();

    const { status, body } = await dispatch(router, {
      method: "GET",
      url: "/",
      user: ada,
      query: { page: 1, limit: 10 },
    });

    expect(status).toBe(200);
    expect(body).toEqual({
      pageData: { page: 1, limit: 10, hasNextPages: false, totalPages: 1 },
      results: [objectContaining({ id: "request1" })],
    });
  });
});

describe("GET /contacts", () => {
  test("returns a page of the contacts' transactions", async () => {
    seedFeed();

    const { body } = await dispatch(router, {
      method: "GET",
      url: "/contacts",
      user: ada,
      query: { page: 2, limit: 4 },
      pageSize: 4,
    });

    expect(body).toMatchObject({ pageData: { page: 2, totalPages: 2, hasNextPages: false } });
    expect(resultIds(body)).toEqual(["contact1", "contact0"]);
  });
});

describe("GET /public", () => {
  test("the first page leads with at most five contact transactions", async () => {
    seedFeed();

    const { body } = await dispatch(router, {
      method: "GET",
      url: "/public",
      user: ada,
      query: { page: 1, limit: 10 },
    });

    expect(resultIds(body)).toEqual([
      "contact5",
      "contact4",
      "contact3",
      "contact2",
      "contact1",
      "public1",
    ]);
  });

  test("later pages contain only non-contact public transactions", async () => {
    seedFeed();

    const { body } = await dispatch(router, {
      method: "GET",
      url: "/public",
      user: ada,
      query: { page: 2, limit: 1 },
      pageSize: 1,
    });

    expect(body).toMatchObject({ pageData: { page: 2, totalPages: 1 }, results: [] });
  });

  test("without a query it returns every non-contact public transaction", async () => {
    seedFeed();

    const { body } = await dispatch(router, { method: "GET", url: "/public", user: ada });

    expect(resultIds(body)).toEqual(["public1"]);
  });
});

test("POST / creates a payment for the authenticated user", async () => {
  seedFeed();

  const { status, body } = await dispatch(router, {
    method: "POST",
    url: "/",
    user: ada,
    body: {
      transactionType: "payment",
      source: "bank1",
      receiverId: "user2",
      description: "Lunch",
      amount: "12.50",
    },
  });

  expect(status).toBe(200);
  expect(body).toEqual({
    transaction: objectContaining({ senderId: "user1", amount: 1250 }),
  });
  expect(required(getUserById("user1"), "user1").balance).toBe(8750);
});

test("GET /:transactionId returns the formatted transaction", async () => {
  seedPeople({ transactions: [buildTransaction({ id: "t45AiwidW" })] });

  const { body } = await dispatch(router, { method: "GET", url: "/t45AiwidW", user: ada });

  expect(body).toEqual({
    transaction: objectContaining({ id: "t45AiwidW", senderName: "Ada Lovelace" }),
  });
});

test("PATCH /:transactionId updates the request status", async () => {
  seedPeople({
    transactions: [
      buildTransaction({
        id: "t45AiwidW",
        senderId: "user3",
        receiverId: "user1",
        requestStatus: TransactionRequestStatus.pending,
      }),
    ],
  });

  const result = await dispatch(router, {
    method: "PATCH",
    url: "/t45AiwidW",
    user: ada,
    body: { requestStatus: TransactionRequestStatus.rejected },
  });

  expect(result).toEqual({ status: 204 });
  expect(required(getTransactionById("t45AiwidW"), "transaction").requestStatus).toBe(TransactionRequestStatus.rejected);
});
