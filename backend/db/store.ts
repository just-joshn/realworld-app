import path from "path";
import fs from "fs";
import { LowSync, MemorySync } from "lowdb";
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
export const db = new LowSync<DbSchema>(
  process.env["VITEST"] === "true"
    ? new MemorySync<DbSchema>()
    : new JSONFileSync<DbSchema>(databaseFile),
  emptyDatabase()
);
db.read();

export function rows<K extends keyof DbSchema>(entity: K): DbSchema[K] {
  return db.data[entity];
}

export function persist(): void {
  db.write();
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

  db.data = parseDatabase(testSeed);
  persist();
};

export const getAllForEntity = <K extends keyof DbSchema>(entity: K): DbSchema[K] =>
  db.data[entity];

export function replaceDatabase(state: DbSchema): void {
  db.data = state;
  persist();
}

export function getAllBy(entity: keyof DbSchema, key: string, value: unknown): object[] {
  const items: readonly object[] = db.data[entity];
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
  const items: readonly object[] = db.data[entity];
  return select(items, query);
}

export function insertRow<K extends keyof DbSchema>(entity: K, row: DbSchema[K][number]): void {
  const table: DbSchema[K][number][] = rows(entity);
  table.push(row);
  persist();
}
