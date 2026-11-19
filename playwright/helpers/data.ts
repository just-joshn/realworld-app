import { Faker, base, en } from "@faker-js/faker";
import type { ApiBankAccount, ApiUser } from "./schemas";

export type NewUser = Pick<
  ApiUser,
  "firstName" | "lastName" | "username" | "password" | "email" | "phoneNumber"
> & { balance?: number };

export type NewBankAccount = Pick<ApiBankAccount, "bankName" | "routingNumber" | "accountNumber">;

/** A user the API created, with the plain-text password the tests sign in with. */
export type TestUser = Omit<ApiUser, "password"> & { password: string };

/** A Faker whose output depends only on `seed`, so a failing run can be reproduced. */
export function seededFaker(seed: string): Faker {
  const fake = new Faker({ locale: [en, base] });
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  fake.seed(Math.abs(hash));
  return fake;
}

export function buildUser(fake: Faker, overrides: Partial<NewUser> = {}): NewUser {
  return {
    firstName: fake.person.firstName(),
    lastName: fake.person.lastName(),
    // Seeded data repeats across runs that share a database, so add a seeded random suffix.
    username: `${fake.internet.username()}_${fake.string.uuid().slice(0, 8)}`,
    password: fake.internet.password({ length: 10 }),
    email: fake.internet.email(),
    phoneNumber: fake.helpers.replaceSymbols("###-###-####"),
    ...overrides,
  };
}

export function buildBankAccount(fake: Faker): NewBankAccount {
  return {
    bankName: `${fake.company.name()} Bank`,
    routingNumber: fake.finance.routingNumber(),
    accountNumber: fake.finance.accountNumber(10),
  };
}

export function fullName(user: Pick<ApiUser, "firstName" | "lastName">): string {
  return `${user.firstName} ${user.lastName}`;
}

/** Formats cents the way the app does, for example 123456 -> "$1,234.56". */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
