import { test as base, expect, type APIRequestContext } from "@playwright/test";
import type { Faker } from "@faker-js/faker";
import { createBankAccount, createUser } from "../helpers/api";
import {
  buildBankAccount,
  buildUser,
  seededFaker,
  type NewUser,
  type TestUser,
} from "../helpers/data";
import { SignInPage } from "../pages/sign-in.page";

export type AppOptions = {
  /** Where the Express API listens. Browser projects use `baseURL` for the web app. */
  apiURL: string;
  /** The web app origin the API allows through CORS. */
  webURL: string;
};

type BaseFixtures = {
  /** Faker seeded from the test's identity and attempt, so its data is reproducible. */
  fake: Faker;
  /** Creates a user through the API. */
  createUser: (overrides?: Partial<NewUser>) => Promise<TestUser>;
  /** Returns an API client signed in as `user`, with its own session. */
  apiAs: (user: TestUser) => Promise<APIRequestContext>;
  /** A new user who already has a bank account, so they skip onboarding. */
  onboardedUser: TestUser;
  signInPage: SignInPage;
};

// The runner gives `playwright.request.newContext()` the project's `use` options, including the
// signed-in storageState, so every API client starts from an empty cookie jar instead.
export const NO_SESSION = { cookies: [], origins: [] };

export const test = base.extend<BaseFixtures, AppOptions>({
  apiURL: ["http://localhost:3301", { option: true, scope: "worker" }],
  webURL: ["http://localhost:3300", { option: true, scope: "worker" }],

  fake: async ({}, use, testInfo) => {
    await use(seededFaker([testInfo.testId, testInfo.retry, testInfo.repeatEachIndex].join(":")));
  },

  createUser: async ({ playwright, apiURL, fake }, use) => {
    const api = await playwright.request.newContext({ baseURL: apiURL, storageState: NO_SESSION });
    await use((overrides) => createUser(api, buildUser(fake, overrides)));
    await api.dispose();
  },

  apiAs: async ({ playwright, apiURL }, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async (user) => {
      const api = await playwright.request.newContext({
        baseURL: apiURL,
        storageState: NO_SESSION,
        extraHTTPHeaders: { Accept: "application/json" },
      });
      contexts.push(api);
      const response = await api.post("/login", {
        data: { username: user.username, password: user.password },
      });
      await expect(response).toBeOK();
      return api;
    });
    await Promise.all(contexts.map((api) => api.dispose()));
  },

  onboardedUser: async ({ createUser, apiAs, fake }, use) => {
    const user = await createUser({ balance: 10_000 });
    await createBankAccount(await apiAs(user), buildBankAccount(fake));
    await use(user);
  },

  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },
});

export { expect };
