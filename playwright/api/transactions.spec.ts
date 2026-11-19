import { test, expect } from "../fixtures/base";
import {
  pageDataSchema,
  readBody,
  readJson,
  rowsSchema,
  transactionSchema,
  validationErrorsSchema,
} from "../helpers/schemas";
import * as yup from "yup";
import { addContact, createTransaction, getCurrentUser, getTransaction } from "../helpers/api";
import { fullName } from "../helpers/data";

test.describe("POST /transactions", { tag: ["@api", "@transactions"] }, () => {
  test("a payment moves money from the sender to the receiver", async ({ createUser, apiAs }) => {
    const sender = await createUser({ balance: 10_000 });
    const receiver = await createUser({ balance: 0 });
    const senderApi = await apiAs(sender);

    const response = await senderApi.post("/transactions", {
      data: {
        transactionType: "payment",
        receiverId: receiver.id,
        amount: 12.5,
        description: "Lunch",
        privacyLevel: "public",
      },
    });

    expect(response.status()).toBe(200);
    const { transaction } = await readBody(
      response,
      yup.object({ transaction: transactionSchema.defined() })
    );
    expect(transaction).toMatchObject({
      id: expect.any(String),
      uuid: expect.any(String),
      senderId: sender.id,
      receiverId: receiver.id,
      amount: 1_250,
      description: "Lunch",
      privacyLevel: "public",
      createdAt: expect.any(String),
      modifiedAt: expect.any(String),
    });
    expect(transaction.requestStatus).toBeUndefined();
    expect((await getTransaction(senderApi, transaction.id)).status).toBe("complete");
    expect((await getCurrentUser(senderApi)).balance).toBe(8_750);
    expect((await getCurrentUser(await apiAs(receiver))).balance).toBe(1_250);
  });

  test("a request leaves balances alone until it is answered", async ({ createUser, apiAs }) => {
    const requester = await createUser({ balance: 0 });
    const payer = await createUser({ balance: 10_000 });
    const requesterApi = await apiAs(requester);

    const response = await requesterApi.post("/transactions", {
      data: {
        transactionType: "request",
        receiverId: payer.id,
        amount: 40,
        description: "Concert tickets",
      },
    });

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toMatchObject({
      transaction: {
        senderId: requester.id,
        receiverId: payer.id,
        amount: 4_000,
        status: "pending",
        requestStatus: "pending",
      },
    });
    expect((await getCurrentUser(requesterApi)).balance).toBe(0);
    expect((await getCurrentUser(await apiAs(payer))).balance).toBe(10_000);
  });

  test("422 — invalid payload", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.post("/transactions", {
      data: { transactionType: "gift", amount: "lots", privacyLevel: "everyone" },
    });

    expect(response.status()).toBe(422);
    const paths = (await readBody(response, validationErrorsSchema)).errors.map(({ path }) => path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "transactionType",
        "privacyLevel",
        "receiverId",
        "description",
        "amount",
      ])
    );
  });

  test("401 — no session", async ({ request, createUser }) => {
    const receiver = await createUser();

    const response = await request.post("/transactions", {
      data: { transactionType: "payment", receiverId: receiver.id, amount: 1, description: "x" },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /transactions", { tag: ["@api", "@transactions"] }, () => {
  test("lists the user's sent and received transactions, newest first", async ({
    createUser,
    apiAs,
  }) => {
    const me = await createUser({ balance: 10_000 });
    const friend = await createUser({ balance: 10_000 });
    const myApi = await apiAs(me);
    const sent = await createTransaction(myApi, {
      transactionType: "payment",
      receiverId: friend.id,
      amount: 5,
      description: "Coffee",
    });
    const received = await createTransaction(await apiAs(friend), {
      transactionType: "payment",
      receiverId: me.id,
      amount: 7,
      description: "Snacks",
    });
    await createTransaction(await apiAs(friend), {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 9,
      description: "Not mine",
    });

    const response = await myApi.get("/transactions");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      pageData: { page: 1, limit: 10, hasNextPages: false, totalPages: 1 },
      results: [
        expect.objectContaining({
          id: received.id,
          senderName: fullName(friend),
          receiverName: fullName(me),
          likes: [],
          comments: [],
        }),
        expect.objectContaining({ id: sent.id }),
      ],
    });
  });

  test("filters by request status, amount, and date", async ({ createUser, apiAs }) => {
    const me = await createUser({ balance: 10_000 });
    const friend = await createUser();
    const api = await apiAs(me);
    const small = await createTransaction(api, {
      transactionType: "payment",
      receiverId: friend.id,
      amount: 5,
      description: "Small",
    });
    const request = await createTransaction(api, {
      transactionType: "request",
      receiverId: friend.id,
      amount: 50,
      description: "Big",
    });
    const ids = async (params: Record<string, string>) =>
      (await readBody(await api.get("/transactions", { params }), rowsSchema)).results.map(
        ({ id }) => id
      );

    expect(await ids({ requestStatus: "pending" })).toEqual([request.id]);
    expect(await ids({ amountMin: "0", amountMax: "1000" })).toEqual([small.id]);
    expect(
      await ids({
        dateRangeStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        dateRangeEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    ).toEqual(expect.arrayContaining([small.id, request.id]));
    expect(
      await ids({
        dateRangeStart: "2001-01-01T00:00:00.000Z",
        dateRangeEnd: "2001-01-02T00:00:00.000Z",
      })
    ).toEqual([]);
  });

  test("pages through results", async ({ createUser, apiAs }) => {
    const me = await createUser({ balance: 10_000 });
    const friend = await createUser();
    const api = await apiAs(me);
    const first = await createTransaction(api, {
      transactionType: "payment",
      receiverId: friend.id,
      amount: 1,
      description: "First",
    });
    await createTransaction(api, {
      transactionType: "payment",
      receiverId: friend.id,
      amount: 2,
      description: "Second",
    });

    const response = await api.get("/transactions", { params: { page: 2, limit: 1 } });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      pageData: { page: 2, limit: 1, hasNextPages: false, totalPages: 2 },
      results: [expect.objectContaining({ id: first.id })],
    });
  });

  test("422 — non-numeric amount filter", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.get("/transactions", { params: { amountMin: "lots" } });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ path: "amountMin" })],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/transactions");

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /transactions/contacts", { tag: ["@api", "@transactions"] }, () => {
  test("lists transactions that involve the user's contacts", async ({ createUser, apiAs }) => {
    const me = await createUser();
    const friend = await createUser({ balance: 10_000 });
    const stranger = await createUser({ balance: 10_000 });
    const myApi = await apiAs(me);
    await addContact(myApi, friend.id);
    const friendsPayment = await createTransaction(await apiAs(friend), {
      transactionType: "payment",
      receiverId: stranger.id,
      amount: 3,
      description: "Friend's payment",
    });
    await createTransaction(await apiAs(stranger), {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 4,
      description: "Stranger's payment",
    });

    const response = await myApi.get("/transactions/contacts");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      pageData: { page: 1, limit: 10, hasNextPages: false, totalPages: 1 },
      results: [expect.objectContaining({ id: friendsPayment.id })],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/transactions/contacts");

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /transactions/public", { tag: ["@api", "@transactions"] }, () => {
  test("lists public transactions and hides private ones", async ({ createUser, apiAs }) => {
    const me = await createUser();
    const payer = await createUser({ balance: 10_000 });
    const payee = await createUser();
    const payerApi = await apiAs(payer);
    const start = new Date(Date.now() - 1_000).toISOString();
    const shared = await createTransaction(payerApi, {
      transactionType: "payment",
      receiverId: payee.id,
      amount: 6,
      description: "Shared",
      privacyLevel: "public",
    });
    const secret = await createTransaction(payerApi, {
      transactionType: "payment",
      receiverId: payee.id,
      amount: 8,
      description: "Secret",
      privacyLevel: "private",
    });

    // Other workers publish transactions too, so only look at the last few seconds.
    const response = await (
      await apiAs(me)
    ).get("/transactions/public", {
      params: {
        dateRangeStart: start,
        dateRangeEnd: new Date(Date.now() + 1_000).toISOString(),
        limit: 50,
      },
    });

    expect(response.status()).toBe(200);
    const body = await readBody(response, rowsSchema.shape({ pageData: pageDataSchema.defined() }));
    expect(body.pageData).toMatchObject({ page: 1, limit: 50 });
    const ids = body.results.map(({ id }) => id);
    expect(ids).toContain(shared.id);
    expect(ids).not.toContain(secret.id);
  });

  test("422 — unknown sort order", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.get("/transactions/public", { params: { order: "random" } });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ path: "order" })],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/transactions/public");

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /transactions/:transactionId", { tag: ["@api", "@transactions"] }, () => {
  test("returns the transaction with names, likes, and comments", async ({ createUser, apiAs }) => {
    const sender = await createUser({ balance: 10_000 });
    const receiver = await createUser();
    const api = await apiAs(sender);
    const transaction = await createTransaction(api, {
      transactionType: "payment",
      receiverId: receiver.id,
      amount: 2,
      description: "Detail",
    });

    const response = await api.get(`/transactions/${transaction.id}`);

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toMatchObject({
      transaction: {
        id: transaction.id,
        senderName: fullName(sender),
        receiverName: fullName(receiver),
        likes: [],
        comments: [],
        amount: 200,
        description: "Detail",
      },
    });
  });

  test("422 — malformed id", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.get("/transactions/not*a*short*id");

    expect(response.status()).toBe(422);
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/transactions/abc123");

    expect(response.status()).toBe(401);
  });
});

test.describe("PATCH /transactions/:transactionId", { tag: ["@api", "@transactions"] }, () => {
  test("accepting a request pays the requester", async ({ createUser, apiAs }) => {
    const requester = await createUser({ balance: 0 });
    const payer = await createUser({ balance: 10_000 });
    const payerApi = await apiAs(payer);
    const request = await createTransaction(await apiAs(requester), {
      transactionType: "request",
      receiverId: payer.id,
      amount: 25,
      description: "Dinner",
    });

    const response = await payerApi.patch(`/transactions/${request.id}`, {
      data: { requestStatus: "accepted" },
    });

    expect(response.status()).toBe(204);
    expect(await getTransaction(payerApi, request.id)).toMatchObject({
      requestStatus: "accepted",
      status: "complete",
    });
    expect((await getCurrentUser(payerApi)).balance).toBe(7_500);
    expect((await getCurrentUser(await apiAs(requester))).balance).toBe(2_500);
  });

  test("rejecting a request leaves balances alone", async ({ createUser, apiAs }) => {
    const requester = await createUser({ balance: 0 });
    const payer = await createUser({ balance: 10_000 });
    const payerApi = await apiAs(payer);
    const request = await createTransaction(await apiAs(requester), {
      transactionType: "request",
      receiverId: payer.id,
      amount: 25,
      description: "Dinner",
    });

    const response = await payerApi.patch(`/transactions/${request.id}`, {
      data: { requestStatus: "rejected" },
    });

    expect(response.status()).toBe(204);
    expect(await getTransaction(payerApi, request.id)).toMatchObject({
      requestStatus: "rejected",
      status: "complete",
    });
    expect((await getCurrentUser(payerApi)).balance).toBe(10_000);
    expect((await getCurrentUser(await apiAs(requester))).balance).toBe(0);
  });

  test("422 — unknown request status", async ({ createUser, apiAs }) => {
    const requester = await createUser();
    const payer = await createUser();
    const request = await createTransaction(await apiAs(requester), {
      transactionType: "request",
      receiverId: payer.id,
      amount: 1,
      description: "Gum",
    });

    const response = await (
      await apiAs(payer)
    ).patch(`/transactions/${request.id}`, { data: { requestStatus: "maybe" } });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ path: "requestStatus" })],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.patch("/transactions/abc123", {
      data: { requestStatus: "accepted" },
    });

    expect(response.status()).toBe(401);
  });
});
