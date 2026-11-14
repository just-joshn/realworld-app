import bcrypt from "bcryptjs";
import fs from "fs";
import { describe, expect, test, vi } from "vitest";
import { buildBankAccount, buildDbState, buildUser } from "../test/factories";
import { resetDatabase, seedPeople } from "../test/database";
import { BankTransferType, DefaultPrivacyLevel } from "../src/models";
import {
  cleanSearchQuery,
  createBankAccountForUser,
  createBankTransfer,
  createContactForUser,
  createUser,
  getAllBy,
  getAllContacts,
  getAllForEntity,
  getAllUsers,
  getBankAccountById,
  getBankAccountsByUserId,
  getBankTransferByTransactionId,
  getBankTransfersByUserId,
  getBy,
  getContactsByUserId,
  getContactsByUsername,
  getRandomUser,
  getUserById,
  getUserByUsername,
  removeBankAccountById,
  removeContactById,
  removeUserFromResults,
  searchUsers,
  seedDatabase,
  updateUserById,
} from "./database";

vi.mock(import("lowdb/adapters/FileSync"), async () => ({
  default: (await import("lowdb/adapters/Memory")).default,
}));

describe("seedDatabase", () => {
  test("replaces the database with the seed file contents", () => {
    resetDatabase({ users: [buildUser({ id: "stale" })] });
    const seed = buildDbState({ users: [buildUser({ id: "seeded" })] });
    const readFileSync = vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(seed));

    seedDatabase();

    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/data[\\/]database-seed\.json$/),
      "utf-8"
    );
    expect(getAllUsers()).toEqual([expect.objectContaining({ id: "seeded" })]);
  });
});

describe("generic lookups", () => {
  test("getBy returns the first record matching a key", () => {
    seedPeople();

    expect(getBy("users", "username", "grace")).toMatchObject({ id: "user2" });
  });

  test("getAllBy returns every record matching a key", () => {
    seedPeople();

    expect(getAllBy("users", "defaultPrivacyLevel", DefaultPrivacyLevel.public)).toHaveLength(2);
  });

  test("getAllForEntity returns the whole table", () => {
    seedPeople();

    expect(getAllForEntity("contacts")).toEqual(getAllContacts());
    expect(getAllForEntity("contacts")).toHaveLength(1);
  });
});

describe("users", () => {
  test("looks users up by id and username", () => {
    seedPeople();

    expect(getUserById("user2")).toMatchObject({ username: "grace" });
    expect(getUserByUsername("alan")).toMatchObject({ id: "user3" });
  });

  test("createUser stores a hashed password and a numeric balance", () => {
    resetDatabase();

    const user = createUser({
      ...buildUser(),
      username: "newbie",
      password: "s3cret",
      balance: "250" as unknown as number,
    });

    expect(user).toMatchObject({ username: "newbie", balance: 250, id: expect.any(String) });
    expect(bcrypt.compareSync("s3cret", user.password)).toBe(true);
    expect(getUserByUsername("newbie")).toEqual(user);
  });

  test("createUser defaults a missing balance to zero", () => {
    resetDatabase();
    const details = buildUser({ password: "s3cret", balance: undefined });

    expect(createUser(details).balance).toBe(0);
  });

  test("updateUserById applies the edits to the stored user", () => {
    seedPeople();

    updateUserById("user1", { firstName: "Augusta" });

    expect(getUserById("user1")).toMatchObject({ firstName: "Augusta", lastName: "Lovelace" });
  });

  test("getRandomUser returns one of the stored users", () => {
    seedPeople();

    expect(["user1", "user2", "user3"]).toContain(getRandomUser().id);
  });

  test("getRandomUser throws when there are no users", () => {
    resetDatabase();

    expect(() => getRandomUser()).toThrow("Missing random user");
  });
});

describe("user search", () => {
  test("cleanSearchQuery strips non-alphanumeric characters", () => {
    expect(cleanSearchQuery("gr@ce h0pper!")).toBe("grceh0pper");
  });

  test("searchUsers ranks the closest name match first", () => {
    seedPeople();

    expect(searchUsers("grace")[0]).toMatchObject({ id: "user2" });
  });

  test("removeUserFromResults drops the given user", () => {
    const results = [buildUser({ id: "user1" }), buildUser({ id: "user2" })];

    expect(removeUserFromResults("user1", results).map((user) => user.id)).toEqual(["user2"]);
  });
});

describe("contacts", () => {
  test("getContactsByUsername returns the user's contacts", () => {
    seedPeople();

    expect(getContactsByUsername("ada")).toEqual([
      expect.objectContaining({ contactUserId: "user2" }),
    ]);
  });

  test("createContactForUser stores and returns the new contact", () => {
    seedPeople();

    const contact = createContactForUser("user2", "user3");

    expect(contact).toMatchObject({ userId: "user2", contactUserId: "user3" });
    expect(getContactsByUserId("user2")).toEqual([contact]);
  });

  test("removeContactById deletes the contact", () => {
    seedPeople();

    removeContactById("contact1");

    expect(getContactsByUserId("user1")).toEqual([]);
  });
});

describe("bank accounts", () => {
  test("createBankAccountForUser stores an active account for the user", () => {
    resetDatabase();

    const account = createBankAccountForUser("user1", {
      bankName: "First Bank",
      accountNumber: "123456789",
      routingNumber: "987654321",
    });

    expect(account).toMatchObject({ userId: "user1", bankName: "First Bank", isDeleted: false });
    expect(getBankAccountsByUserId("user1")).toEqual([account]);
  });

  test("removeBankAccountById soft-deletes the account", () => {
    resetDatabase({ bankaccounts: [buildBankAccount({ id: "bank1" })] });

    removeBankAccountById("bank1");

    expect(getBankAccountById("bank1")).toMatchObject({ isDeleted: true });
  });
});

describe("bank transfers", () => {
  test("createBankTransfer stores the transfer with generated fields", () => {
    resetDatabase();

    const transfer = createBankTransfer({
      userId: "user1",
      source: "bank1",
      amount: 1500,
      transactionId: "txn1",
      type: BankTransferType.withdrawal,
    });

    expect(transfer).toMatchObject({
      id: expect.any(String),
      amount: 1500,
      createdAt: expect.any(Date),
    });
    expect(getBankTransfersByUserId("user1")).toEqual([transfer]);
    expect(getBankTransferByTransactionId("txn1")).toEqual(transfer);
  });
});
