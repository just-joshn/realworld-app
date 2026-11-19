import { spawn } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { env } from "node:process";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import { localOrigin } from "../../src/utils/apiConfig";
import { BACKEND_PORT, CORS_ORIGIN_PORT } from "./ports";

const root = fileURLToPath(new URL("../..", import.meta.url));
const databaseFile = join(root, "data/database.json");

export default async function setup(project: TestProject) {
  const backupDir = mkdtempSync(join(tmpdir(), "rwa-integration-"));
  const databaseBackup = join(backupDir, "database.json");
  copyFileSync(databaseFile, databaseBackup);

  const api = spawn("bun", ["backend/app.ts"], {
    cwd: root,
    // `env` rather than `process.env`: the project's `define` rewrites `process.env` here too.
    env: {
      ...env,
      NODE_ENV: "test",
      PORT: String(CORS_ORIGIN_PORT),
      VITE_BACKEND_PORT: String(BACKEND_PORT),
    },
    stdio: ["ignore", "ignore", "inherit"],
  });

  const apiUrl = localOrigin(BACKEND_PORT);
  await waitForApi(apiUrl, () => api.exitCode);

  project.provide("apiUrl", apiUrl);

  return () => {
    api.kill();
    copyFileSync(databaseBackup, databaseFile);
    rmSync(backupDir, { recursive: true });
  };
}

// vi.waitFor only works inside test files, not in globalSetup.
async function waitForApi(apiUrl: string, exitCode: () => number | null) {
  const deadline = Date.now() + 20_000;
  for (;;) {
    if (exitCode() !== null) throw new Error(`API exited with code ${String(exitCode())}`);
    const ready = await fetch(apiUrl).then(
      (response) => response.ok,
      () => false
    );
    if (ready) return;
    if (Date.now() > deadline) throw new Error(`API did not start on ${apiUrl}`);
    await sleep(200);
  }
}

declare module "vitest" {
  export interface ProvidedContext {
    apiUrl: string;
  }
}
