import { test, expect } from "../fixtures/base";
import { readBody, readJson, rowsSchema } from "../helpers/schemas";

const entities = [
  "users",
  "contacts",
  "bankaccounts",
  "notifications",
  "transactions",
  "likes",
  "comments",
  "banktransfers",
];

test.describe("GET /testData/:entity", { tag: ["@api", "@test-data"] }, () => {
  for (const entity of entities) {
    test(`dumps every ${entity} row`, async ({ request }) => {
      const response = await request.get(`/testData/${entity}`);

      expect(response.status()).toBe(200);
      // Every row carries an id and a uuid; readBody rejects the body otherwise.
      const { results } = await readBody(response, rowsSchema);
      expect(results.length).toBeGreaterThan(0);
    });
  }

  test("includes rows created through the API", async ({ request, createUser }) => {
    const user = await createUser();

    const response = await request.get("/testData/users");

    expect(response.status()).toBe(200);
    expect(await readJson(response)).toEqual({
      results: expect.arrayContaining([
        expect.objectContaining({ id: user.id, username: user.username }),
      ]),
    });
  });

  test("422 — unknown entity", async ({ request }) => {
    const response = await request.get("/testData/secrets");

    expect(response.status()).toBe(422);
    expect(await readJson(response)).toEqual({
      errors: [expect.objectContaining({ param: "entity", value: "secrets" })],
    });
  });
});
