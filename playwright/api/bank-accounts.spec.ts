import { test, expect } from "../fixtures/base";
import { readJson } from "../helpers/schemas";
import { createBankAccount } from "../helpers/api";
import { buildBankAccount } from "../helpers/data";

test.describe("POST /bankAccounts", { tag: ["@api", "@bank-accounts"] }, () => {
  test("creates a bank account for the signed-in user", async ({ createUser, apiAs, fake }) => {
    const me = await createUser();
    const api = await apiAs(me);
    const details = buildBankAccount(fake);

    const response = await api.post("/bankAccounts", { data: details });

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toMatchObject({
      account: {
        id: expect.any(String),
        uuid: expect.any(String),
        userId: me.id,
        ...details,
        isDeleted: false,
        createdAt: expect.any(String),
        modifiedAt: expect.any(String),
      },
    });
  });

  test("422 — missing account details", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.post("/bankAccounts", { data: { bankName: "Half Bank" } });

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: expect.arrayContaining([
        expect.objectContaining({ param: "accountNumber" }),
        expect.objectContaining({ param: "routingNumber" }),
      ]),
    });
  });

  test("401 — no session", async ({ request, fake }) => {
    const response = await request.post("/bankAccounts", { data: buildBankAccount(fake) });

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /bankAccounts", { tag: ["@api", "@bank-accounts"] }, () => {
  test("lists only the signed-in user's accounts", async ({ createUser, apiAs, fake }) => {
    const api = await apiAs(await createUser());
    const mine = await createBankAccount(api, buildBankAccount(fake));
    await createBankAccount(await apiAs(await createUser()), buildBankAccount(fake));

    const response = await api.get("/bankAccounts");

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      results: [expect.objectContaining({ id: mine.id })],
    });
  });

  test("401 — no session", async ({ request }) => {
    const response = await request.get("/bankAccounts");

    expect(response.status()).toBe(401);
  });
});

test.describe("GET /bankAccounts/:bankAccountId", { tag: ["@api", "@bank-accounts"] }, () => {
  test("returns the account", async ({ createUser, apiAs, fake }) => {
    const api = await apiAs(await createUser());
    const account = await createBankAccount(api, buildBankAccount(fake));

    const response = await api.get(`/bankAccounts/${account.id}`);

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({ account: account });
  });

  test("422 — malformed id", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.get("/bankAccounts/not*a*short*id");

    expect(response.status()).toBe(422);
  });

  test("401 — no session", async ({ request, createUser, apiAs, fake }) => {
    const account = await createBankAccount(
      await apiAs(await createUser()),
      buildBankAccount(fake)
    );

    const response = await request.get(`/bankAccounts/${account.id}`);

    expect(response.status()).toBe(401);
  });
});

test.describe("DELETE /bankAccounts/:bankAccountId", { tag: ["@api", "@bank-accounts"] }, () => {
  test("soft-deletes the account", async ({ createUser, apiAs, fake }) => {
    const api = await apiAs(await createUser());
    const account = await createBankAccount(api, buildBankAccount(fake));

    const response = await api.delete(`/bankAccounts/${account.id}`);

    expect(response.status()).toBe(200);
    expect(await readJson(await api.get(`/bankAccounts/${account.id}`))).toMatchObject({
      account: { id: account.id, isDeleted: true },
    });
  });

  test("422 — malformed id", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.delete("/bankAccounts/not*a*short*id");

    expect(response.status()).toBe(422);
  });

  test("401 — no session", async ({ request, createUser, apiAs, fake }) => {
    const account = await createBankAccount(
      await apiAs(await createUser()),
      buildBankAccount(fake)
    );

    const response = await request.delete(`/bankAccounts/${account.id}`);

    expect(response.status()).toBe(401);
  });
});
