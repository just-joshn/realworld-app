import path from "path";
import fs from "fs";
import { MemorySync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import { parseDatabase } from "../database-schema";
import type {
  BankAccount,
  Transaction,
  User,
  Contact,
  Like,
  Comment,
  NotificationType,
  BankTransfer,
} from "../../src/models";
import type { DbSchema } from "../../src/models/db-schema";

export type TDatabase = {
  users: User[];
  contacts: Contact[];
  bankaccounts: BankAccount[];
  transactions: Transaction[];
  likes: Like[];
  comments: Comment[];
  notifications: NotificationType[];
  banktransfers: BankTransfer[];
};

export const USER_TABLE = "users";
export const CONTACT_TABLE = "contacts";
export const BANK_ACCOUNT_TABLE = "bankaccounts";
export const TRANSACTION_TABLE = "transactions";
export const LIKE_TABLE = "likes";
export const COMMENT_TABLE = "comments";
export const NOTIFICATION_TABLE = "notifications";
export const BANK_TRANSFER_TABLE = "banktransfers";

function emptyDatabase(): DbSchema {
  return {
    users: [],
    contacts: [],
    bankaccounts: [],
    transactions: [],
    likes: [],
    comments: [],
    notifications: [],
    banktransfers: [],
  };
}

const databaseFile = path.join(__dirname, "../../data/database.json");
// lowdb's own preset switches to memory for every NODE_ENV=test process, including the API
// server the integration suite starts. Only the Vitest process itself should skip the file.
const adapter =
  process.env["VITEST"] === "true"
    ? new MemorySync<DbSchema>()
    : new JSONFileSync<DbSchema>(databaseFile);

let state: DbSchema = adapter.read() ?? emptyDatabase();

/** The current immutable database value. Every write replaces it through `replaceDatabase`. */
export function snapshot(): DbSchema {
  return state;
}

/** The only persistence boundary: swap in a new database value and write it out. */
export function replaceDatabase(next: DbSchema): void {
  state = next;
  adapter.write(state);
}

export function rows<K extends keyof DbSchema>(entity: K): DbSchema[K] {
  return state[entity];
}

export function replaceTable<K extends keyof DbSchema>(entity: K, table: DbSchema[K]): void {
  replaceDatabase({ ...state, [entity]: table });
}

function rowMatches(item: object, query: object): boolean {
  return Object.entries(query).every(([key, value]) =>
    Object.entries(item).some(([itemKey, itemValue]) => itemKey === key && itemValue === value)
  );
}

export function select<T extends object>(items: readonly T[], query: object): T[] {
  return items.filter((item) => rowMatches(item, query));
}

export const seedDatabase = () => {
  const testSeed: unknown = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "database-seed.json"), "utf-8")
  );

  replaceDatabase(parseDatabase(testSeed));
};

export const getAllForEntity = <K extends keyof DbSchema>(entity: K): DbSchema[K] => state[entity];

export function getAllBy(entity: keyof DbSchema, key: string, value: unknown): object[] {
  const items: readonly object[] = state[entity];
  return select(items, { [key]: value });
}

export function getBy<K extends keyof DbSchema>(
  entity: K,
  key: string,
  value: unknown
): DbSchema[K][number] | undefined {
  return rows(entity).find((item) => rowMatches(item, { [key]: value }));
}

export function getAllByObj(entity: keyof DbSchema, query: object): object[] {
  const items: readonly object[] = state[entity];
  return select(items, query);
}

export function insertRow<K extends keyof DbSchema>(entity: K, row: DbSchema[K][number]): void {
  const table: readonly DbSchema[K][number][] = state[entity];
  replaceDatabase({ ...state, [entity]: [...table, row] });
}
