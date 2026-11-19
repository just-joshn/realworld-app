import { test, expect } from "../fixtures/base";
import { readJson } from "../helpers/schemas";
import { createTransaction, getUnreadNotifications } from "../helpers/api";
import { fullName } from "../helpers/data";

test.describe("POST /comments/:transactionId", { tag: ["@api", "@comments"] }, () => {
  test("comments on the transaction and notifies both people in it", async ({
    createUser,
    apiAs,
  }) => {
    const sender = await createUser({ balance: 1_000 });
    const receiver = await createUser();
    const commenter = await createUser();
    const transaction = await createTransaction(await apiAs(sender), {
      transactionType: "payment",
      receiverId: receiver.id,
      amount: 1,
      description: "Talkative",
    });

    const response = await (
      await apiAs(commenter)
    ).post(`/comments/${transaction.id}`, { data: { content: "Nice!" } });

    expect(response.status()).toBe(200);
    expect(await response.text()).toBe("OK");
    for (const person of [sender, receiver]) {
      expect(await getUnreadNotifications(await apiAs(person))).toContainEqual(
        expect.objectContaining({
          transactionId: transaction.id,
          commentId: expect.any(String),
          userFullName: fullName(commenter),
        })
      );
    }
  });

  test("422 — missing content", async ({ createUser, apiAs }) => {
    const sender = await createUser({ balance: 1_000 });
    const api = await apiAs(sender);
    const transaction = await createTransaction(api, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 1,
      description: "Quiet",
    });

    const response = await api.post(`/comments/${transaction.id}`, { data: {} });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ path: "content" })],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.post("/comments/abc123", { data: { content: "Hi" } });

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /comments/:transactionId", { tag: ["@api", "@comments"] }, () => {
  test("lists the transaction's comments", async ({ createUser, apiAs }) => {
    const sender = await createUser({ balance: 1_000 });
    const senderApi = await apiAs(sender);
    const transaction = await createTransaction(senderApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 1,
      description: "Talkative",
    });
    await senderApi.post(`/comments/${transaction.id}`, { data: { content: "First!" } });

    const response = await senderApi.get(`/comments/${transaction.id}`);

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      comments: [
        expect.objectContaining({
          id: expect.any(String),
          content: "First!",
          userId: sender.id,
          transactionId: transaction.id,
        }),
      ],
    });
  });

  test("422 — malformed transaction id", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.get("/comments/not*a*short*id");

    expect(response.status()).toBe(422);
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/comments/abc123");

    expect(response.status()).toBe(401);
  });
});
