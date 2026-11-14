import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "../fixtures/base";
import { readBody, rowsSchema } from "../helpers/schemas";
import * as yup from "yup";

const seed = yup
  .object({ users: rowsSchema.fields.results, transactions: rowsSchema.fields.results })
  .validateSync(
    JSON.parse(readFileSync(path.resolve(__dirname, "../../data/database-seed.json"), "utf-8")),
    { strict: true }
  );

test.describe("POST /testData/seed", { tag: ["@api", "@test-data"] }, () => {
  test("resets the database to the seed data", async ({ request, createUser }) => {
    const user = await createUser();

    const response = await request.post("/testData/seed");

    expect(response.status()).toBe(200);
    expect(await response.text()).toBe("OK");
    const users = (await readBody(await request.get("/testData/users"), rowsSchema)).results;
    expect(users.map(({ id }) => id)).toEqual(seed.users.map(({ id }) => id));
    expect(users).not.toContainEqual(expect.objectContaining({ id: user.id }));
    const transactions = (await readBody(await request.get("/testData/transactions"), rowsSchema))
      .results;
    expect(transactions).toHaveLength(seed.transactions.length);
  });
});
