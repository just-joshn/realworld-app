import { test, expect } from "../fixtures/base";
import { readJson } from "../helpers/schemas";
import { createTransaction } from "../helpers/api";
import { fullName } from "../helpers/data";

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
