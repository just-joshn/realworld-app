import { test, expect } from "../fixtures/base";
import { readBody, readJson, rowsSchema } from "../helpers/schemas";
import { createTransaction } from "../helpers/api";
import { fullName } from "../helpers/data";

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
});

test.describe("GET /transactions", { tag: ["@api", "@transactions"] }, () => {
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
});

test.describe("GET /transactions", { tag: ["@api", "@transactions"] }, () => {
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
