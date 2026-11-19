#!/usr/bin/env bun
/**
 * Strict, zero-exception style gate for realworld-app.
 * Every scanned file gets every rule. Exit 0 only with zero violations.
 *
 *   bun scripts/style-compliance.mjs           # human-readable
 *   bun scripts/style-compliance.mjs --json    # machine-readable
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectFiles } from "./style/files.mjs";
import { formatText, summarize } from "./style/report.mjs";
import { scanSource } from "./style/scan.mjs";

const ROOT = join(import.meta.dirname, "..");

function main() {
  const files = collectFiles(ROOT);
  const violations = files.flatMap((rel) => scanSource(rel, readFileSync(join(ROOT, rel), "utf8")));
  const summary = summarize(files.length, violations);
  const asJson = process.argv.slice(2).includes("--json");
  process.stdout.write(asJson ? JSON.stringify(summary, null, 2) + "\n" : formatText(summary));
  process.exit(violations.length === 0 ? 0 : 1);
}

main();
