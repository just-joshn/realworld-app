import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { msw } from "msw/vite";
import viteConfig from "./vite.config";

export default defineConfig((env) =>
  mergeConfig(
    viteConfig(env),
    defineConfig({
      test: {
        exclude: [...configDefaults.exclude, "cypress/**", "build/**"],
        restoreMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
        expect: { requireAssertions: true },
        coverage: {
          provider: "v8",
          include: ["src/utils/**/*.ts", "src/machines/**/*.ts", "backend/**/*.ts"],
          exclude: ["**/*.d.ts", "backend/app.ts"],
          reporter: ["text", "html", "lcov"],
          thresholds: { branches: 80 },
        },
        projects: [
          {
            test: {
              name: "unit",
              include: ["src/**/*.test.ts", "backend/**/*.test.ts"],
              environment: "node",
              setupFiles: ["./test/msw.ts"],
              env: {
                VITE_BACKEND_PORT: "3001",
              },
            },
          },
          {
            // The app reads process.env at runtime; the browser has no process, so inline it.
            define: {
              "process.env": JSON.stringify({
                VITE_BACKEND_PORT: "3001",
                VITE_AUTH_TOKEN_NAME: "authAccessToken",
                VITE_GOOGLE_CLIENTID: "test-client-id.apps.googleusercontent.com",
              }),
            },
            plugins: [msw({ mode: "worker-only" })],
            test: {
              name: "browser",
              include: ["src/**/*.browser.test.tsx"],
              setupFiles: ["./test/browser/setup.ts"],
              browser: {
                enabled: true,
                headless: true,
                provider: playwright({ actionTimeout: 5_000 }),
                instances: [{ browser: "chromium" }],
              },
            },
          },
        ],
      },
    })
  )
);
