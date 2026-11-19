import fs from "node:fs";
import path from "node:path";
import { outDir } from "./config.mjs";
import * as session from "./session.mjs";

let steps = [];
let stepNo = 0;
let failed = false;

const out = (line) => process.stdout.write(`${line}\n`);
const warn = (line) => process.stderr.write(`${line}\n`);

// Waits that may legitimately time out (UI settling, screenshots) report on stderr instead of failing a check.
const bestEffort = (promise, what) =>
  promise.catch((e) =>
    warn(`  note: ${what} did not complete: ${session.firstLine(String(e.message))}`)
  );

const describeActual = (actual) =>
  actual !== undefined ? `  (actual: ${JSON.stringify(actual)})` : "";

async function capture(n, label) {
  const page = session.currentPage();
  const base = path.join(
    outDir,
    String(n).padStart(2, "0") + "-" + label.replace(/\W+/g, "-").toLowerCase()
  );
  await page.waitForTimeout(400); // let MUI dialog/drawer transitions settle so the shot shows the end state
  await bestEffort(
    page.screenshot({ path: base + ".png", fullPage: true, animations: "disabled" }),
    "screenshot"
  );
  const aria = await page
    .locator("body")
    .ariaSnapshot()
    .catch((e) => `aria snapshot failed: ${e.message}`);
  fs.writeFileSync(base + ".aria.yml", aria);
}

// Runs one journey step; returns whatever `fn` returns so later steps can use its results.
async function step(label, fn) {
  stepNo += 1;
  const n = stepNo;
  let checks = [];
  const check = (desc, ok, actual) => {
    checks = [...checks, { desc, ok: !!ok, actual }];
    if (!ok) failed = true;
    out(`${ok ? "  ok  " : "  FAIL"} ${desc}${describeActual(actual)}`);
  };
  out(`[${n}] ${label}`);
  let result;
  try {
    result = await fn(check);
  } catch (e) {
    check(`step threw: ${session.firstLine(e.message)}`, false);
  }
  const url = session.currentPage().url();
  await capture(n, label);
  steps = [...steps, { n, label, checks, url }];
  return result;
}

const hasFailed = () => failed;
const getSteps = () => steps;

export { step, out, warn, bestEffort, hasFailed, getSteps };
