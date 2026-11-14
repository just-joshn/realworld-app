import path from "node:path";
import type { APIRequestContext } from "@playwright/test";
import { test as base, expect, NO_SESSION } from "./base";
import { createBankAccount, createUser } from "../helpers/api";
import { buildBankAccount, buildUser, seededFaker, type TestUser } from "../helpers/data";
import { AUTH_DIR } from "../helpers/paths";
import { required } from "../../backend/required";
import { SignInPage } from "../pages/sign-in.page";

type WorkerAuthFixtures = {
  /** One signed-in account per worker, so parallel workers never touch each other's data. */
  workerUser: TestUser;
  workerStorageState: string;
};

type AuthFixtures = {
  /** The signed-in user every page in this test starts as. */
  user: TestUser;
  /** An API client signed in as `user`, for arranging data and checking side effects. */
  userApi: APIRequestContext;
};

export const test = base.extend<AuthFixtures, WorkerAuthFixtures>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  workerUser: [
    async ({ playwright, apiURL }, use, workerInfo) => {
      const fake = seededFaker(`worker:${String(workerInfo.workerIndex)}`);
      const api = await playwright.request.newContext({
        baseURL: apiURL,
        storageState: NO_SESSION,
      });
      const user = await createUser(api, buildUser(fake, { balance: 500_000 }));
      await expect(
        await api.post("/login", { data: { username: user.username, password: user.password } })
      ).toBeOK();
      await createBankAccount(api, buildBankAccount(fake));
      await api.dispose();
      await use(user);
    },
    { scope: "worker" },
  ],

  workerStorageState: [
    async ({ browser, workerUser }, use, workerInfo) => {
      const file = path.join(AUTH_DIR, `worker-${String(workerInfo.workerIndex)}.json`);
      // The app keeps its signed-in state in localStorage, so sign in through the UI once.
      const context = await browser.newContext({
        baseURL: required(workerInfo.project.use.baseURL, "project baseURL"),
        storageState: NO_SESSION,
      });
      const page = await context.newPage();
      const signInPage = new SignInPage(page);
      await signInPage.goto();
      await signInPage.signIn(workerUser);
      await expect(page.getByText(`@${workerUser.username}`)).toBeVisible();
      await context.storageState({ path: file });
      await context.close();
      await use(file);
    },
    { scope: "worker" },
  ],

  user: async ({ workerUser }, use) => {
    await use(workerUser);
  },

  userApi: async ({ apiAs, workerUser }, use) => {
    await use(await apiAs(workerUser));
  },
});

export { expect };
