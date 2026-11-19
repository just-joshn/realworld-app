import fs from "node:fs";
import { FRONTEND, BACKEND, DB_FILE, SEED } from "./config.mjs";
import * as session from "./session.mjs";
import { bestEffort } from "./recorder.mjs";

const { page } = session;

const MAX_DB_READ_ATTEMPTS = 20;
const DB_RETRY_MS = 50;
const POLL_TOTAL_MS = 5000;
const POLL_INTERVAL_MS = 250;

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// The API rewrites the whole file on every mutation; a read can land mid-write, so retry parse errors.
function db() {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch (e) {
      if (attempt >= MAX_DB_READ_ATTEMPTS) throw e;
      sleepSync(DB_RETRY_MS);
    }
  }
}

const tid = (id) => `[data-test="${id}"]`;
const input = (id) => `${tid(id)} input`; // MUI TextField puts data-test on the wrapper
const user = (username) => db().users.find((x) => x.username === username);
const usd = (cents) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const pathnameIs = (expected) => new URL(page.url()).pathname === expected;

// checkAuth from inside the page, so it uses the browser's session cookie.
const checkAuth = () =>
  session.currentPage().evaluate(async (url) => {
    const r = await fetch(url + "/checkAuth", { credentials: "include" });
    const authed = r.ok ? (await r.json()).user : null;
    return {
      status: r.status,
      username: authed && authed.username,
      balance: authed && authed.balance,
    };
  }, BACKEND);

async function signIn(username, password, { remember = false } = {}) {
  await page.goto(FRONTEND + "/signin");
  await page.fill(input("signin-username"), username);
  await page.fill(input("signin-password"), password);
  if (remember) await page.check(`${tid("signin-remember-me")} input`);
  await page.click(tid("signin-submit"));
}

async function signInAs(username) {
  await session.newSession();
  await signIn(username, SEED.password);
  await page.waitForSelector(tid("sidenav-user-balance"));
}

async function poll(fn, ms = POLL_TOTAL_MS) {
  let found;
  for (let t = 0; t < ms && !(found = fn()); t += POLL_INTERVAL_MS) {
    await page.waitForTimeout(POLL_INTERVAL_MS);
  }
  return found;
}

const sidenavBalanceIs = (cents) =>
  page
    .waitForFunction(
      ([sel, v]) => document.querySelector(sel)?.textContent.trim() === v,
      [tid("sidenav-user-balance"), usd(cents)],
      { timeout: POLL_TOTAL_MS }
    )
    .then(
      () => true,
      () => false
    );

const sidenavBalanceText = () => page.textContent(tid("sidenav-user-balance"));

export {
  page,
  db,
  tid,
  input,
  user,
  usd,
  pathnameIs,
  checkAuth,
  signIn,
  signInAs,
  poll,
  sidenavBalanceIs,
  sidenavBalanceText,
  bestEffort,
};
