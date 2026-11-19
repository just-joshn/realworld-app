import { defineConfig, devices } from "@playwright/test";
import type { AppOptions } from "./playwright/fixtures/base";
import { defaultApiUrl, defaultWebUrl } from "./playwright/helpers/origins.config";

const { BASE_URL, API_URL: API_URL_OVERRIDE, CI } = process.env;
const isCI = Boolean(CI);
const WEB_URL = BASE_URL ?? defaultWebUrl;
const API_URL = API_URL_OVERRIDE ?? defaultApiUrl;

const apiUse = {
  baseURL: API_URL,
  extraHTTPHeaders: { Accept: "application/json" },
};

export default defineConfig<object, AppOptions>({
  testDir: "./playwright",
  testMatch: "**/*.spec.ts",

  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: "50%" } : {}),

  reporter: isCI
    ? [["html", { open: "never" }], ["github"]]
    : [["list"], ["html", { open: "never" }]],

  globalSetup: "./playwright/global-setup.ts",
  globalTeardown: "./playwright/global-teardown.ts",

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    apiURL: API_URL,
    webURL: WEB_URL,
    testIdAttribute: "data-test",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
    timezoneId: "UTC",
  },

  projects: [
    {
      name: "api",
      testDir: "./playwright/api",
      testIgnore: /test-data-seed\.spec\.ts/,
      use: apiUse,
    },
    {
      name: "e2e",
      testDir: "./playwright/e2e",
      testIgnore: /\.mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: WEB_URL },
    },
    {
      name: "e2e-mobile",
      testDir: "./playwright/e2e",
      testMatch: /\.mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"], baseURL: WEB_URL },
    },
    {
      // Reseeding wipes every user the other projects create, so it runs after all of them.
      name: "api-reseed",
      testDir: "./playwright/api",
      testMatch: /test-data-seed\.spec\.ts/,
      dependencies: ["api", "e2e", "e2e-mobile"],
      use: apiUse,
    },
  ],

  webServer: [
    {
      command: "bun run predev:cognito:ci && bun backend/app.ts",
      url: API_URL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      env: {
        NODE_ENV: "test",
        PORT: new URL(WEB_URL).port,
        VITE_BACKEND_PORT: new URL(API_URL).port,
      },
    },
    {
      command: `bunx vite --port ${new URL(WEB_URL).port} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        VITE_BACKEND_PORT: new URL(API_URL).port,
      },
    },
  ],
});
