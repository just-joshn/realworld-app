import { test, expect } from "../fixtures/base";
import { readBody, readJson, transactionSchema, validationErrorsSchema } from "../helpers/schemas";
import * as yup from "yup";
import { getCurrentUser, getTransaction } from "../helpers/api";

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
