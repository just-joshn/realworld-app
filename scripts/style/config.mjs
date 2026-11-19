export const MAX_FILE_LINES = 400;
export const MAX_FN_LINES = 50;
export const MAX_NESTING = 4;

export const SOURCE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

/** Skipped at any depth. */
export const SKIP_ANYWHERE = ["node_modules", ".git"];

/** Skipped only at the repo root (tooling output, assets, vendored/generated trees). */
export const SKIP_AT_ROOT = [
  "build",
  "data",
  "public",
  "coverage",
  ".audit",
  ".pi",
  ".vitest",
  "amplify",
  "playwright-report",
  "test-results",
];

export const SCANNED_ROOT_DIRS = ["src", "backend", "scripts", "playwright", "test"];

export const RULE_IDS = [
  "file-size",
  "fn-size",
  "nesting",
  "no-console-log",
  "no-array-mutation",
  "no-object-mutation",
  "no-hardcoded-url",
  "no-swallowed-error",
];
