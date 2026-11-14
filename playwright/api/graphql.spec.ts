import { test, expect } from "../fixtures/base";
import { createBankAccount } from "../helpers/api";
import { buildBankAccount } from "../helpers/data";
import { bankAccountSchema, readBody, readJson } from "../helpers/schemas";
import * as yup from "yup";

const GQL_ENDPOINT = "/graphql";

const LIST_BANK_ACCOUNTS = `
  query ListBankAccount {
    listBankAccount { id uuid userId bankName accountNumber routingNumber isDeleted createdAt modifiedAt }
  }
`;

const CREATE_BANK_ACCOUNT = `
  mutation CreateBankAccount($bankName: String!, $accountNumber: String!, $routingNumber: String!) {
    createBankAccount(bankName: $bankName, accountNumber: $accountNumber, routingNumber: $routingNumber) {
      id userId bankName accountNumber routingNumber isDeleted createdAt modifiedAt
    }
  }
`;

const DELETE_BANK_ACCOUNT = `
  mutation DeleteBankAccount($id: ID!) {
    deleteBankAccount(id: $id)
  }
`;

test.describe("GET /graphql", { tag: ["@api", "@graphql"] }, () => {
  test("serves the GraphQL playground", async ({ request }) => {
    const response = await request.get(GQL_ENDPOINT, { headers: { Accept: "text/html" } });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
    expect(await response.text()).toContain("GraphQL Playground");
  });
});

test.describe("POST /graphql listBankAccount", { tag: ["@api", "@graphql"] }, () => {
  test("lists the signed-in user's bank accounts", async ({ createUser, apiAs, fake }) => {
    const me = await createUser();
    const api = await apiAs(me);
    const account = await createBankAccount(api, buildBankAccount(fake));

    const response = await api.post(GQL_ENDPOINT, { data: { query: LIST_BANK_ACCOUNTS } });

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      data: {
        listBankAccount: [
          {
            id: account.id,
            uuid: account.uuid,
            userId: me.id,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            routingNumber: account.routingNumber,
            isDeleted: false,
            createdAt: account.createdAt,
            modifiedAt: account.modifiedAt,
          },
        ],
      },
    });
  });

  test("errors without a session", async ({ request }) => {
    const response = await request.post(GQL_ENDPOINT, { data: { query: LIST_BANK_ACCOUNTS } });

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      data: { listBankAccount: null },
      errors: [
        expect.objectContaining({
          message: "Error: Missing GraphQL user",
          path: ["listBankAccount"],
        }),
      ],
    });
  });
});

test.describe("POST /graphql createBankAccount", { tag: ["@api", "@graphql"] }, () => {
  test("creates a bank account for the signed-in user", async ({ createUser, apiAs, fake }) => {
    const me = await createUser();
    const api = await apiAs(me);
    const details = buildBankAccount(fake);

    const response = await api.post(GQL_ENDPOINT, {
      data: { query: CREATE_BANK_ACCOUNT, variables: details },
    });

    expect(response.status()).toBe(200);
    const body = await readBody(
      response,
      yup.object({ data: yup.object({ createBankAccount: bankAccountSchema.omit(["uuid"]) }) })
    );
    expect(body).toEqual({
      data: {
        createBankAccount: {
          id: expect.any(String),
          userId: me.id,
          ...details,
          isDeleted: false,
          createdAt: expect.any(String),
          modifiedAt: expect.any(String),
        },
      },
    });
    expect(await readJson(await api.get("/bankAccounts"))).toEqual({
      results: [expect.objectContaining({ id: body.data.createBankAccount.id })],
    });
  });

  test("rejects a mutation missing required variables", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.post(GQL_ENDPOINT, {
      data: { query: CREATE_BANK_ACCOUNT, variables: { bankName: "Half Bank" } },
    });

    // With `Accept: application/json`, graphql-http reports validation errors with a 200.
    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      errors: expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("$accountNumber") }),
        expect.objectContaining({ message: expect.stringContaining("$routingNumber") }),
      ]),
    });
  });
});

test.describe("POST /graphql deleteBankAccount", { tag: ["@api", "@graphql"] }, () => {
  test("soft-deletes the bank account", async ({ createUser, apiAs, fake }) => {
    const api = await apiAs(await createUser());
    const account = await createBankAccount(api, buildBankAccount(fake));

    const response = await api.post(GQL_ENDPOINT, {
      data: { query: DELETE_BANK_ACCOUNT, variables: { id: account.id } },
    });

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({ data: { deleteBankAccount: true } });
    expect(await readJson(await api.get(`/bankAccounts/${account.id}`))).toMatchObject({
      account: { isDeleted: true },
    });
  });

  test("rejects an unknown field", async ({ createUser, apiAs }) => {
    const api = await apiAs(await createUser());

    const response = await api.post(GQL_ENDPOINT, {
      data: { query: "mutation { deleteEverything }" },
    });

    // With `Accept: application/json`, graphql-http reports validation errors with a 200.
    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ message: expect.stringContaining("deleteEverything") })],
    });
  });
});
