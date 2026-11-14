import { copyFileSync, mkdirSync } from "node:fs";
import { request, type FullConfig } from "@playwright/test";
import { DATABASE_BACKUP, DATABASE_FILE, DATABASE_BACKUP_DIR } from "./helpers/paths";
import { required } from "../backend/required";

// The API keeps everything in data/database.json, which is tracked in git. Back it up so
// globalTeardown can put it back, then reseed so every run starts from the same data.
export default async function globalSetup(config: FullConfig) {
  mkdirSync(DATABASE_BACKUP_DIR, { recursive: true });
  copyFileSync(DATABASE_FILE, DATABASE_BACKUP);

  const apiURL = required(
    config.projects.find(({ name }) => name === "api")?.use.baseURL,
    "api project baseURL"
  );
  const api = await request.newContext({ baseURL: apiURL });
  const response = await api.post("/testData/seed");
  await api.dispose();
  if (!response.ok()) {
    throw new Error(`Seeding ${apiURL} failed with ${String(response.status())}`);
  }
}
