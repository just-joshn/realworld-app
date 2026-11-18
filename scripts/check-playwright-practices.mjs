import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const findings = [];

function rel(path) {
  return path.startsWith(root) ? path.slice(root.length) : path;
}

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (path.endsWith(".ts")) files.push(path);
  }
  return files;
}

function check(ok, label) {
  findings.push(`${ok ? "ok" : "gap"}  ${label}`);
}

const banned = [
  [/waitForTimeout\s*\(/, "waitForTimeout"],
  [/new Promise\s*\(\s*(?:resolve)?\s*=>\s*setTimeout/, "setTimeout sleep"],
  [/\bsetTimeout\s*\(/, "setTimeout"],
  [/page\.route\s*\(|context\.route\s*\(/, "route() mock"],
  [/\.locator\s*\(/, "locator()"],
  [/xpath=|css=/, "xpath or css engine"],
  [/force:\s*true/, "force: true"],
  [/\btest\.only\s*\(/, "test.only"],
  [/page\.fill\s*\(|page\.click\s*\(/, "page.fill or page.click"],
  [/\.type\s*\(\s*[^)]/, "locator.type"],
];

const suite = walk(join(root, "playwright"));
const hits = new Map(banned.map(([, label]) => [label, []]));
for (const file of suite) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const [pattern, label] of banned) {
      if (pattern.test(line)) hits.get(label).push(`${rel(file)}:${index + 1}`);
    }
  });
}
for (const [, label] of banned) {
  const where = hits.get(label);
  check(where.length === 0, where.length === 0 ? `no ${label}` : `${label} at ${where.join(", ")}`);
}

const config = readFileSync(join(root, "playwright.config.ts"), "utf8");
const configNeeds = [
  ["fullyParallel: true", "fullyParallel"],
  ["forbidOnly: isCI", "forbidOnly in CI"],
  ["retries: isCI ? 2 : 0", "retries 0 local, 2 in CI"],
  ['workers: "50%"', "CI workers 50%"],
  ['trace: "on-first-retry"', "trace on-first-retry"],
  ['video: "retain-on-failure"', "video retain-on-failure"],
  ['screenshot: "only-on-failure"', "screenshot only-on-failure"],
  ['testIdAttribute: "data-test"', "data-test test id"],
  ["reuseExistingServer: !isCI", "reuseExistingServer outside CI"],
  ['["github"]', "github reporter in CI"],
];
for (const [needle, label] of configNeeds) {
  check(config.includes(needle), `config ${label}`);
}
check(!/trace:\s*["']on["']/.test(config), "config trace is not always on");
check(!/video:\s*["']on["']/.test(config), "config video is not always on");
check(
  config.includes('devices["Desktop Chrome"]') && config.includes('devices["Pixel 7"]'),
  "desktop and Pixel 7 projects"
);
check(
  !/devices\["(Desktop Firefox|Desktop Safari|Pixel 5)"\]/.test(config),
  "no extra browser projects"
);

const ci = readFileSync(join(root, ".github/workflows/main.yml"), "utf8");
const ciNeeds = [
  ["playwright test", "runs playwright test"],
  ["playwright install --with-deps", "installs browsers with --with-deps"],
  ["~/.cache/ms-playwright", "caches Playwright browsers"],
  ["timeout-minutes:", "sets timeout-minutes"],
  ["cancel-in-progress: true", "cancels superseded runs"],
  ["!cancelled()", "uploads the report unless cancelled"],
  ["retention-days:", "sets artifact retention-days"],
  ["npx playwright test --grep-invert @flaky", "runs the stable suite"],
  ["test-results/**/trace.zip", "uploads traces"],
  ["test-results/**/*.png", "uploads screenshots"],
  ["test-results/**/*.webm", "uploads videos"],
];
for (const [needle, label] of ciNeeds) {
  check(ci.includes(needle), `ci ${label}`);
}
check(!ci.includes("--grep @smoke"), "ci does not limit pull requests to @smoke");
const retention = [...ci.matchAll(/retention-days:\s*(\d+)/g)].map((match) => Number(match[1]));
if (retention.length === 0) check(false, "ci retention-days is 7 to 14");
else
  check(
    retention.every((days) => days >= 7 && days <= 14),
    `ci retention-days is 7 to 14 (found ${retention.join(", ")})`
  );
const timeout = ci.match(/timeout-minutes:\s*(\d+)/);
check(
  Boolean(timeout) && Number(timeout[1]) >= 20 && Number(timeout[1]) <= 30,
  "ci timeout-minutes is 20 to 30"
);

const browserFixture = readFileSync(join(root, "playwright/fixtures/browser.ts"), "utf8");
check(browserFixture.includes('page.on("console"'), "browser tests listen for console");
check(browserFixture.includes('page.on("pageerror"'), "browser tests listen for pageerror");

const signup = readFileSync(join(root, "playwright/e2e/auth/sign-up.spec.ts"), "utf8");
const feed = readFileSync(join(root, "playwright/e2e/transaction-feed.spec.ts"), "utf8");
check(signup.includes("test.step("), "sign-up journey uses test.step");
check(feed.includes("test.step("), "transaction feed journey uses test.step");

const apiHelpers = readFileSync(join(root, "playwright/helpers/api.ts"), "utf8");
const baseFixture = readFileSync(join(root, "playwright/fixtures/base.ts"), "utf8");
check(baseFixture.includes("runRecordedDeletes"), "tests delete records they create");
check(apiHelpers.includes("/bankAccounts/"), "bank account deletes use the bank account route");
check(apiHelpers.includes("/contacts/"), "contact deletes use the contact route");

const e2eImports = walk(join(root, "playwright/e2e")).filter((file) =>
  readFileSync(file, "utf8").includes("fixtures/base")
);
check(
  e2eImports.length === 0,
  e2eImports.length === 0
    ? "browser specs import the browser fixture"
    : `browser specs still import base: ${e2eImports.map(rel).join(", ")}`
);

// Specs may still read text they expect with getByText. Every other locator lives in a page object.
const specSelector = /\.(getByRole|getByLabel|getByPlaceholder|getByTestId)\s*\(/;
const specSelectors = walk(join(root, "playwright/e2e")).flatMap((file) =>
  readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line, index) => (specSelector.test(line) ? [`${rel(file)}:${index + 1}`] : []))
);
check(
  specSelectors.length === 0,
  specSelectors.length === 0
    ? "e2e specs locate elements through page objects"
    : `e2e specs locate elements directly at ${specSelectors.join(", ")}`
);

const failed = findings.filter((line) => line.startsWith("gap"));
console.log(findings.join("\n"));
console.log(`\n${findings.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length === 0 ? 0 : 1);
