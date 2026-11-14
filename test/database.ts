import db from "../backend/database";
import { DbSchema } from "../src/models/db-schema";
import { buildContact, buildDbState, buildTransaction, buildUser } from "./factories";
import { DefaultPrivacyLevel } from "../src/models";

// Test files that import this module must replace the file adapter with the in-memory one:
// vi.mock(import("lowdb/adapters/FileSync"), async () => ({
//   default: (await import("lowdb/adapters/Memory")).default,
// }));

export function resetDatabase(overrides: Partial<DbSchema> = {}) {
  db.setState(buildDbState(overrides));
  return db;
}

export const ada = () =>
  buildUser({ id: "user1", firstName: "Ada", lastName: "Lovelace", username: "ada" });
export const grace = () =>
  buildUser({
    id: "user2",
    firstName: "Grace",
    lastName: "Hopper",
    username: "grace",
    email: "grace@example.com",
    balance: 5000,
    avatar: "https://example.com/grace.png",
    defaultPrivacyLevel: DefaultPrivacyLevel.private,
  });
export const alan = () =>
  buildUser({
    id: "user3",
    firstName: "Alan",
    lastName: "Turing",
    username: "alan",
    email: "alan@example.com",
    balance: 0,
    avatar: "https://example.com/alan.png",
  });

// Ada has Grace as a contact. Grace and Alan have no contacts.
export function seedPeople(overrides: Partial<DbSchema> = {}) {
  return resetDatabase({
    users: [ada(), grace(), alan()],
    contacts: [buildContact({ id: "contact1", userId: "user1", contactUserId: "user2" })],
    ...overrides,
  });
}

export const paymentFromAdaToGrace = (overrides = {}) =>
  buildTransaction({ id: "txn1", senderId: "user1", receiverId: "user2", ...overrides });
