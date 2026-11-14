import { test, expect } from "../fixtures/base";
import { readJson } from "../helpers/schemas";
import { createTransaction, getUnreadNotifications } from "../helpers/api";
import { fullName } from "../helpers/data";

test.describe("POST /likes/:transactionId", { tag: ["@api", "@likes"] }, () => {
  test("likes the transaction and notifies both people in it", async ({ createUser, apiAs }) => {
    const sender = await createUser({ balance: 1_000 });
    const receiver = await createUser();
    const fan = await createUser();
    const transaction = await createTransaction(await apiAs(sender), {
      transactionType: "payment",
      receiverId: receiver.id,
      amount: 1,
      description: "Likeable",
    });
    const fanApi = await apiAs(fan);

    const response = await fanApi.post(`/likes/${transaction.id}`);

    expect(response.status()).toBe(200);
    expect(await response.text()).toBe("OK");
    for (const person of [sender, receiver]) {
      expect(await getUnreadNotifications(await apiAs(person))).toContainEqual(
        expect.objectContaining({
          transactionId: transaction.id,
          likeId: expect.any(String),
          userFullName: fullName(fan),
        })
      );
    }
  });

  test("422 — malformed transaction id", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.post("/likes/not*a*short*id");

    expect(response.status()).toBe(422);
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.post("/likes/abc123");

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /likes/:transactionId", { tag: ["@api", "@likes"] }, () => {
  test("lists who liked the transaction", async ({ createUser, apiAs }) => {
    const sender = await createUser({ balance: 1_000 });
    const receiver = await createUser();
    const fan = await createUser();
    const senderApi = await apiAs(sender);
    const transaction = await createTransaction(senderApi, {
      transactionType: "payment",
      receiverId: receiver.id,
      amount: 1,
      description: "Likeable",
    });
    await (await apiAs(fan)).post(`/likes/${transaction.id}`);

    const response = await senderApi.get(`/likes/${transaction.id}`);

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      likes: [
        expect.objectContaining({
          id: expect.any(String),
          userId: fan.id,
          transactionId: transaction.id,
        }),
      ],
    });
  });

  test("422 — malformed transaction id", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.get("/likes/not*a*short*id");

    expect(response.status()).toBe(422);
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/likes/abc123");

    expect(response.status()).toBe(401);
  });
});
