import { test, expect } from "../fixtures/base";
import { readJson } from "../helpers/schemas";
import { createTransaction, getCurrentUser } from "../helpers/api";

test.describe("GET /bankTransfers", { tag: ["@api", "@bank-transfers"] }, () => {
  test("lists the withdrawal that covered a payment larger than the balance", async ({
    createUser,
    apiAs,
  }) => {
    const sender = await createUser({ balance: 1_000 });
    const senderApi = await apiAs(sender);
    const payment = await createTransaction(senderApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 25,
      description: "More than I have",
    });

    const response = await senderApi.get("/bankTransfers");

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      transfers: [
        expect.objectContaining({
          id: expect.any(String),
          userId: sender.id,
          transactionId: payment.id,
          type: "withdrawal",
          amount: 1_500,
        }),
      ],
    });
    expect((await getCurrentUser(senderApi)).balance).toBe(0);
  });
});

test.describe("GET /bankTransfers", { tag: ["@api", "@bank-transfers"] }, () => {
  test("lists nothing when payments fit the balance", async ({ createUser, apiAs }) => {
    const sender = await createUser({ balance: 10_000 });
    const senderApi = await apiAs(sender);
    await createTransaction(senderApi, {
      transactionType: "payment",
      receiverId: (await createUser()).id,
      amount: 25,
      description: "Affordable",
    });

    const response = await senderApi.get("/bankTransfers");

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({ transfers: [] });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/bankTransfers");

    expect(response.status()).toBe(401);
  });
});
