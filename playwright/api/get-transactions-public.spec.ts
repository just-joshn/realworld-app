import { test, expect } from "../fixtures/base";
import { pageDataSchema, readBody, readJson, rowsSchema } from "../helpers/schemas";
import { createTransaction } from "../helpers/api";

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
