import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

function rel(path) {
  return path.startsWith(root) ? path.slice(root.length) : path;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith(".ts") ? [path] : [];
  });
}

const check = (ok, label) => `${ok ? "ok" : "gap"}  ${label}`;

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

const read = (relPath) => readFileSync(join(root, relPath), "utf8");
const lineRefs = (file, matches) =>
  readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line, index) => (matches(line) ? [`${rel(file)}:${index + 1}`] : []));

function bannedFindings() {
  const suite = walk(join(root, "playwright"));
  return banned.map(([pattern, label]) => {
    const where = suite.flatMap((file) => lineRefs(file, (line) => pattern.test(line)));
    return check(
      where.length === 0,
      where.length === 0 ? `no ${label}` : `${label} at ${where.join(", ")}`
    );
  });
}

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

function configFindings() {
  const config = read("playwright.config.ts");
  return [
    ...configNeeds.map(([needle, label]) => check(config.includes(needle), `config ${label}`)),
    check(!/trace:\s*["']on["']/.test(config), "config trace is not always on"),
    check(!/video:\s*["']on["']/.test(config), "config video is not always on"),
    check(
      config.includes('devices["Desktop Chrome"]') && config.includes('devices["Pixel 7"]'),
      "desktop and Pixel 7 projects"
    ),
    check(
      !/devices\["(Desktop Firefox|Desktop Safari|Pixel 5)"\]/.test(config),
      "no extra browser projects"
    ),
  ];
}

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

function retentionFinding(ci) {
  const retention = [...ci.matchAll(/retention-days:\s*(\d+)/g)].map((match) => Number(match[1]));
  if (retention.length === 0) return check(false, "ci retention-days is 7 to 14");
  return check(
    retention.every((days) => days >= 7 && days <= 14),
    `ci retention-days is 7 to 14 (found ${retention.join(", ")})`
  );
}

function ciFindings() {
  const ci = read(".github/workflows/main.yml");
  const timeout = ci.match(/timeout-minutes:\s*(\d+)/);
  return [
    ...ciNeeds.map(([needle, label]) => check(ci.includes(needle), `ci ${label}`)),
    check(!ci.includes("--grep @smoke"), "ci does not limit pull requests to @smoke"),
    retentionFinding(ci),
    check(
      Boolean(timeout) && Number(timeout[1]) >= 20 && Number(timeout[1]) <= 30,
      "ci timeout-minutes is 20 to 30"
    ),
  ];
}

function fixtureFindings() {
  const browserFixture = read("playwright/fixtures/browser.ts");
  const apiHelpers = read("playwright/helpers/api.ts");
  const baseFixture = read("playwright/fixtures/base.ts");
  return [
    check(browserFixture.includes('page.on("console"'), "browser tests listen for console"),
    check(browserFixture.includes('page.on("pageerror"'), "browser tests listen for pageerror"),
    check(
      read("playwright/e2e/auth/sign-up.spec.ts").includes("test.step("),
      "sign-up journey uses test.step"
    ),
    check(
      read("playwright/e2e/transaction-feed.spec.ts").includes("test.step("),
      "transaction feed journey uses test.step"
    ),
    check(baseFixture.includes("runRecordedDeletes"), "tests delete records they create"),
    check(apiHelpers.includes("/bankAccounts/"), "bank account deletes use the bank account route"),
    check(apiHelpers.includes("/contacts/"), "contact deletes use the contact route"),
  ];
}

// Specs may still read text they expect with getByText. Every other locator lives in a page object.
const specSelector = /\.(getByRole|getByLabel|getByPlaceholder|getByTestId)\s*\(/;

function specFindings() {
  const e2eFiles = walk(join(root, "playwright/e2e"));
  const e2eImports = e2eFiles.filter((file) =>
    readFileSync(file, "utf8").includes("fixtures/base")
  );
  const specSelectors = e2eFiles.flatMap((file) =>
    lineRefs(file, (line) => specSelector.test(line))
  );
  return [
    check(
      e2eImports.length === 0,
      e2eImports.length === 0
        ? "browser specs import the browser fixture"
        : `browser specs still import base: ${e2eImports.map(rel).join(", ")}`
    ),
    check(
      specSelectors.length === 0,
      specSelectors.length === 0
        ? "e2e specs locate elements through page objects"
        : `e2e specs locate elements directly at ${specSelectors.join(", ")}`
    ),
  ];
}

function main() {
  const findings = [
    ...bannedFindings(),
    ...configFindings(),
    ...ciFindings(),
    ...fixtureFindings(),
    ...specFindings(),
  ];
  const failed = findings.filter((line) => line.startsWith("gap"));
  process.stdout.write(`${findings.join("\n")}\n`);
  process.stdout.write(`\n${findings.length - failed.length} passed, ${failed.length} failed\n`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
