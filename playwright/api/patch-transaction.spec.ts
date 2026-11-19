import { test, expect } from "../fixtures/base";
import { readJson } from "../helpers/schemas";
import { createTransaction, getCurrentUser, getTransaction } from "../helpers/api";

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
});

test.describe("PATCH /transactions/:transactionId", { tag: ["@api", "@transactions"] }, () => {
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
});

test.describe("PATCH /transactions/:transactionId", { tag: ["@api", "@transactions"] }, () => {
  test("401 — no session", async ({ request }) => {
    const response = await request.patch("/transactions/abc123", {
      data: { requestStatus: "accepted" },
    });

    expect(response.status()).toBe(401);
  });
});
