import { copyFileSync, rmSync } from "node:fs";
import { DATABASE_BACKUP, DATABASE_BACKUP_DIR, DATABASE_FILE } from "./helpers/paths";

export default function globalTeardown() {
  copyFileSync(DATABASE_BACKUP, DATABASE_FILE);
  rmSync(DATABASE_BACKUP_DIR, { recursive: true });
}
