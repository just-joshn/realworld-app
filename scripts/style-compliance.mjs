#!/usr/bin/env bun
/**
 * Rerunnable style-compliance gate for realworld-app.
 * Exit 0 only when every checked rule reports zero violations.
 *
 * Usage:
 *   bun scripts/style-compliance.mjs           # full gate
 *   bun scripts/style-compliance.mjs --json    # machine-readable
 *   bun scripts/style-compliance.mjs --baseline  # write .audit/style-baseline.json
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const MAX_FILE_LINES = 800;
const WARN_FILE_LINES = 400;
const MAX_FN_LINES = 50;
const MAX_NESTING = 4;

const SKIP_DIRS = new Set([
  "node_modules",
  "build",
  ".git",
  "playwright-report",
  "test-results",
  "data",
  "public",
  "coverage",
  ".audit",
  ".pi",
  ".vitest",
  "amplify",
]);

/** Generated path dumps; size is not a style choice. */
const GENERATED_FILE_RE = /SvgUndraw.*\.tsx$/;

/** CLI / server startup / reporter stdout is intentional, not debug leftover. */
const CONSOLE_LOG_ALLOW = new Set([
  "backend/backend-port.ts",
  "scripts/generateSeedData.ts",
  "scripts/check-playwright-practices.mjs",
  "scripts/style-compliance.mjs",
]);

/**
 * Persistence APIs that append rows to lowdb collections.
 * App and domain code must not mutate arrays/objects in place.
 */
const ARRAY_MUTATOR_ALLOW = [
  { file: "backend/db/store.ts", re: /\btable\.push\(/ },
];

/** Collector scripts build arrays as their output. */
const ARRAY_MUTATOR_FILE_ALLOW = new Set([
  "scripts/check-playwright-practices.mjs",
  "scripts/style-compliance.mjs",
]);

/**
 * Mutation rules apply to product code under src/ and backend/.
 * Playwright page objects, test doubles, and Express harnesses initialize
 * or stub framework objects; those are out of this rule's intent.
 */
function mutationRulesApply(pathRel) {
  if (!(pathRel.startsWith("src/") || pathRel.startsWith("backend/"))) return false;
  if (/\.(test|spec)\./.test(pathRel)) return false;
  if (pathRel.includes(".browser.test.")) return false;
  return true;
}

const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const writeBaseline = args.has("--baseline");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    const ext = name.slice(name.lastIndexOf("."));
    if (!SOURCE_EXT.has(ext)) continue;
    out.push(full);
  }
  return out;
}

function rel(path) {
  return relative(ROOT, path).split("\\").join("/");
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[\s;{}])\/\/.*$/gm, "$1");
}

function measureNesting(line) {
  let depth = 0;
  let max = 0;
  for (const ch of line) {
    if (ch === "{" || ch === "(" || ch === "[") {
      depth += 1;
      if (depth > max) max = depth;
    } else if (ch === "}" || ch === ")" || ch === "]") {
      depth = Math.max(0, depth - 1);
    }
  }
  return max;
}

function scanFile(path) {
  const pathRel = rel(path);
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/);
  const code = stripComments(raw);
  const codeLines = code.split(/\r?\n/);
  const violations = [];
  const notes = [];

  if (!GENERATED_FILE_RE.test(pathRel) && lines.length > MAX_FILE_LINES) {
    violations.push({
      rule: "file-size-max",
      path: pathRel,
      detail: `${lines.length} lines > ${MAX_FILE_LINES}`,
    });
  } else if (!GENERATED_FILE_RE.test(pathRel) && lines.length > WARN_FILE_LINES) {
    notes.push({
      rule: "file-size-warn",
      path: pathRel,
      detail: `${lines.length} lines > ${WARN_FILE_LINES} typical`,
    });
  }

  if (!CONSOLE_LOG_ALLOW.has(pathRel)) {
    codeLines.forEach((line, i) => {
      if (line.includes("console.log")) {
        violations.push({
          rule: "no-console-log",
          path: pathRel,
          detail: `L${i + 1}: ${line.trim().slice(0, 120)}`,
        });
      }
    });
  }

  const checkMutation = mutationRulesApply(pathRel) && !ARRAY_MUTATOR_FILE_ALLOW.has(pathRel);

  // Array mutators (exclude history.push router navigation).
  if (checkMutation) {
    codeLines.forEach((line, i) => {
      if (!/\.(push|pop|splice|sort|reverse|unshift|shift)\s*\(/.test(line)) return;
      if (/\bhistory\.push\s*\(/.test(line)) return;
      if (/\brouter\.push\s*\(/.test(line)) return;
      if (/\bnavigate\s*\(/.test(line)) return;
      const allowed = ARRAY_MUTATOR_ALLOW.some(
        (a) => a.file === pathRel && a.re.test(line)
      );
      if (allowed) return;
      violations.push({
        rule: "no-array-mutation",
        path: pathRel,
        detail: `L${i + 1}: ${line.trim().slice(0, 120)}`,
      });
    });
    codeLines.forEach((line, i) => {
      if (!/\bObject\.assign\s*\(/.test(line)) return;
      if (/\bObject\.assign\s*\(\s*\{\}/.test(line)) return;
      if (/\bObject\.assign\s*\(\s*\.\.\./.test(line)) return;
      violations.push({
        rule: "no-object-mutation",
        path: pathRel,
        detail: `L${i + 1}: ${line.trim().slice(0, 120)}`,
      });
    });
  }

  // Property reassignment on existing values. Constructor `this.x =` is init, not update.
  if (checkMutation) {
    codeLines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("import ") || trimmed.startsWith("export ")) return;
      const m = trimmed.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*=\s*(?!=)/);
      if (!m) return;
      const left = m[1];
      if (left === "this" || left.startsWith("this.")) return;
      if (
        /^(module|exports|process|window|document|globalThis|global|localStorage|sessionStorage|console|require)/.test(
          left
        )
      ) {
        return;
      }
      if (left.includes(".prototype.")) return;
      // lowdb and Express session writes stay at the adapter boundary.
      if (left === "db.data" || left.startsWith("db.data.")) return;
      if (left.startsWith("req.session")) return;
      // DOM node value reset is a host API write, not domain-object mutation.
      if (/\.value\s*=/.test(trimmed) && /current\.value|ref\.value|inputEl/.test(trimmed)) return;
      violations.push({
        rule: "no-object-mutation",
        path: pathRel,
        detail: `L${i + 1}: ${trimmed.slice(0, 120)}`,
      });
    });
  }

  // Nesting depth by brace counting across the file (coarse).
  let depth = 0;
  let maxDepth = 0;
  let maxDepthLine = 1;
  for (let i = 0; i < codeLines.length; i += 1) {
    for (const ch of codeLines[i]) {
      if (ch === "{") {
        depth += 1;
        if (depth > maxDepth) {
          maxDepth = depth;
          maxDepthLine = i + 1;
        }
      } else if (ch === "}") {
        depth = Math.max(0, depth - 1);
      }
    }
  }
  if (maxDepth > MAX_NESTING + 2) {
    // +2 allowance for module/function/block wrappers; flag only deep excess.
    notes.push({
      rule: "nesting-warn",
      path: pathRel,
      detail: `max brace depth ${maxDepth} near L${maxDepthLine}`,
    });
  }

  // Function length: naive export function / const fn = heuristics.
  const fnStarts = [];
  codeLines.forEach((line, i) => {
    if (
      /^\s*(export\s+)?(async\s+)?function\s+/.test(line) ||
      /^\s*(export\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(async\s*)?\(/.test(line) ||
      /^\s*(export\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(async\s+)?function/.test(line)
    ) {
      fnStarts.push(i);
    }
  });
  for (let fi = 0; fi < fnStarts.length; fi += 1) {
    const start = fnStarts[fi];
    const end = fi + 1 < fnStarts.length ? fnStarts[fi + 1] : codeLines.length;
    const span = end - start;
    if (span > MAX_FN_LINES) {
      notes.push({
        rule: "fn-size-warn",
        path: pathRel,
        detail: `fn near L${start + 1} spans ~${span} lines > ${MAX_FN_LINES}`,
      });
    }
  }

  return { path: pathRel, lines: lines.length, violations, notes };
}

function main() {
  const files = walk(ROOT).filter((p) => {
    const r = rel(p);
    return (
      r.startsWith("src/") ||
      r.startsWith("backend/") ||
      r.startsWith("scripts/") ||
      r.startsWith("playwright/") ||
      r.startsWith("test/") ||
      r === "vite.config.ts" ||
      r === "vitest.config.ts" ||
      r === "playwright.config.ts"
    );
  });

  const reports = files.map(scanFile);
  const violations = reports.flatMap((r) => r.violations);
  const notes = reports.flatMap((r) => r.notes);

  const byRule = {};
  for (const v of violations) {
    byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  }

  const summary = {
    filesScanned: files.length,
    violationCount: violations.length,
    noteCount: notes.length,
    byRule,
    overMaxFiles: reports.filter((r) => r.lines > MAX_FILE_LINES).map((r) => ({ path: r.path, lines: r.lines })),
    overWarnFiles: reports
      .filter((r) => r.lines > WARN_FILE_LINES && r.lines <= MAX_FILE_LINES)
      .map((r) => ({ path: r.path, lines: r.lines })),
    violations,
    notes: notes.slice(0, 200),
  };

  if (writeBaseline) {
    mkdirSync(join(ROOT, ".audit"), { recursive: true });
    const out = join(ROOT, ".audit", "style-baseline.json");
    writeFileSync(out, JSON.stringify(summary, null, 2));
    console.error(`wrote ${relative(ROOT, out)}`);
  }

  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    console.log(`files=${summary.filesScanned} violations=${summary.violationCount} notes=${summary.noteCount}`);
    console.log("byRule", JSON.stringify(byRule));
    for (const v of violations) {
      console.log(`[FAIL] ${v.rule} ${v.path} ${v.detail}`);
    }
    if (violations.length === 0) {
      console.log("PASS");
    }
  }

  process.exit(violations.length === 0 ? 0 : 1);
}

main();
