import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default defineConfig((env) =>
  mergeConfig(
    viteConfig(env),
    defineConfig({
      test: {
        name: "unit",
        include: ["src/**/*.test.ts", "backend/**/*.test.ts"],
        exclude: [...configDefaults.exclude, "cypress/**", "build/**"],
        environment: "node",
        setupFiles: ["./test/msw.ts"],
        env: {
          VITE_BACKEND_PORT: "3001",
        },
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
      },
    })
  )
);
