import { describe, expect, test, vi } from "vitest";
import { buildBankAccount, buildUser } from "../../../test/factories";
import { resetDatabase } from "../../../test/database";
import { getBankAccountById } from "../../database";
import resolvers from ".";

vi.mock(import("lowdb/adapters/FileSync"), async () => ({
  default: (await import("lowdb/adapters/Memory")).default,
}));

const context = { user: buildUser({ id: "user1" }) };

describe("Query.listBankAccount", () => {
  test("lists the current user's bank accounts", () => {
    resetDatabase({
      bankaccounts: [
        buildBankAccount({ id: "mine", userId: "user1" }),
        buildBankAccount({ id: "theirs", userId: "user2" }),
      ],
    });

    expect(resolvers.Query.listBankAccount(null, {}, context)).toEqual([
      expect.objectContaining({ id: "mine" }),
    ]);
  });

  test("rethrows a lookup failure as an Error", () => {
    expect(() => resolvers.Query.listBankAccount(null, {}, { user: undefined as never })).toThrow(
      /^TypeError: Cannot read properties of undefined/
    );
  });
});

describe("Mutation", () => {
  test("createBankAccount creates an account for the current user", () => {
    resetDatabase();

    const account = resolvers.Mutation.createBankAccount(
      null,
      { bankName: "First Bank", accountNumber: "123456789", routingNumber: "987654321" },
      context
    );

    expect(account).toMatchObject({ userId: "user1", bankName: "First Bank" });
  });

  test("deleteBankAccount soft-deletes the account and reports success", () => {
    resetDatabase({ bankaccounts: [buildBankAccount({ id: "bank1" })] });

    expect(resolvers.Mutation.deleteBankAccount(null, { id: "bank1" })).toBe(true);
    expect(getBankAccountById("bank1").isDeleted).toBe(true);
  });
});
