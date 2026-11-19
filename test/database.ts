import { avatarUrl } from "./avatar-config";
import { replaceDatabase } from "../backend/database";
import type { DbSchema } from "../src/models/db-schema";
import { buildContact, buildDbState, buildTransaction, buildUser } from "./factories";
import { DefaultPrivacyLevel } from "../src/models";

export function resetDatabase(overrides: Partial<DbSchema> = {}): DbSchema {
  const state = buildDbState(overrides);
  replaceDatabase(state);
  return state;
}

export const ada = () =>
  buildUser({
    id: "user1",
    firstName: "Ada",
    lastName: "Lovelace",
    username: "ada",
  });
export const grace = () =>
  buildUser({
    id: "user2",
    firstName: "Grace",
    lastName: "Hopper",
    username: "grace",
    email: "grace@example.com",
    balance: 5000,
    avatar: avatarUrl("grace"),
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
    avatar: avatarUrl("alan"),
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
  buildTransaction({
    id: "txn1",
    senderId: "user1",
    receiverId: "user2",
    ...overrides,
  });
