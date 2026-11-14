import path from "node:path";

const root = path.resolve(__dirname, "../..");

export const DATABASE_FILE = path.join(root, "data/database.json");
export const DATABASE_BACKUP_DIR = path.join(root, "playwright/.cache");
export const DATABASE_BACKUP = path.join(DATABASE_BACKUP_DIR, "database.json");
export const AUTH_DIR = path.join(root, "playwright/.auth");
