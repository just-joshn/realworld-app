#!/usr/bin/env node
// Drives the running RWA through a real browser, one named journey per run.
// Usage: scripts/drive.sh <journey> [--headed]
// Each step saves a screenshot + ARIA snapshot; steps.json records action, URL, and checks.
// Exit 0 only when every check passed.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const FRONTEND = "http://localhost:3000";
const BACKEND = "http://localhost:3001";
const REPO = path.resolve(__dirname, "../../../..");
const DB_FILE = path.join(REPO, "data/database.json");
const SEED = { username: "Heath93", password: "s3cret" };

const journey = process.argv[2];
const headed = process.argv.includes("--headed");
const runId = process.env.RUN_ID || new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(process.env.EVIDENCE_ROOT || "/tmp/verify-rwa/evidence", runId, journey || "none");

// The API rewrites the whole file on every mutation; a read can land mid-write, so retry parse errors.
const db = () => {
  for (let i = 0; ; i++) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
    catch (e) { if (i >= 20) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); }
  }
};
const tid = (id) => `[data-test="${id}"]`;
const input = (id) => `${tid(id)} input`; // MUI TextField puts data-test on the wrapper

let browser, ctx, page, n = 0;
const consoleErrors = [];

// Fresh browser context = fresh cookies + localStorage, i.e. a different person on a different machine.
async function newSession() {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().split("\n")[0]));
  return ctx;
}
const steps = [];
let failed = false;

async function step(label, fn) {
  const entry = { n: ++n, label, checks: [] };
  steps.push(entry);
  const check = (desc, ok, actual) => {
    entry.checks.push({ desc, ok: !!ok, actual });
    if (!ok) failed = true;
    console.log(`${ok ? "  ok  " : "  FAIL"} ${desc}${actual !== undefined ? `  (actual: ${JSON.stringify(actual)})` : ""}`);
  };
  console.log(`[${entry.n}] ${label}`);
  try {
    await fn(check);
  } catch (e) {
    check(`step threw: ${e.message.split("\n")[0]}`, false);
  }
  entry.url = page.url();
  const base = path.join(outDir, String(entry.n).padStart(2, "0") + "-" + label.replace(/\W+/g, "-").toLowerCase());
  await page.waitForTimeout(400); // let MUI dialog/drawer transitions settle so the shot shows the end state
  await page.screenshot({ path: base + ".png", fullPage: true, animations: "disabled" }).catch(() => {});
  const aria = await page.locator("body").ariaSnapshot().catch((e) => `aria snapshot failed: ${e.message}`);
  fs.writeFileSync(base + ".aria.yml", aria);
}

// checkAuth from inside the page, so it uses the browser's session cookie.
const checkAuth = () =>
  page.evaluate(async (url) => {
    const r = await fetch(url + "/checkAuth", { credentials: "include" });
    const user = r.ok ? (await r.json()).user : null;
    return { status: r.status, username: user && user.username, balance: user && user.balance };
  }, BACKEND);

async function signIn(user, password, { remember = false } = {}) {
  await page.goto(FRONTEND + "/signin");
  await page.fill(input("signin-username"), user);
  await page.fill(input("signin-password"), password);
  if (remember) await page.check(`${tid("signin-remember-me")} input`);
  await page.click(tid("signin-submit"));
}

// ---- money movement helpers ----
const user = (username) => db().users.find((x) => x.username === username);
const usd = (cents) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const PAYEE = "Arvilla_Hegmann"; // seed user, password s3cret
const LOW_BALANCE = "Judah_Dietrich50"; // lowest seed balance ($494.74)

async function signInAs(username) {
  await newSession();
  await signIn(username, SEED.password);
  await page.waitForSelector(tid("sidenav-user-balance"));
}

async function poll(fn, ms = 5000) {
  let v;
  for (let t = 0; t < ms && !(v = fn()); t += 250) await page.waitForTimeout(250);
  return v;
}

async function sidenavBalanceIs(cents) {
  return page
    .waitForFunction(([sel, v]) => document.querySelector(sel)?.textContent.trim() === v, [tid("sidenav-user-balance"), usd(cents)], { timeout: 5000 })
    .then(() => true, () => false);
}

// The New -> pick user -> amount/note -> Pay|Request wizard. Returns the stored transaction.
async function createViaWizard(check, { to, amount, note, type }) {
  const receiver = user(to);
  await page.click(tid("nav-top-new-transaction"));
  await page.waitForSelector(tid("users-list"));
  check("wizard opened at /transaction/new", new URL(page.url()).pathname === "/transaction/new", page.url());
  await page.fill(tid("user-list-search-input"), receiver.firstName);
  await page.click(tid(`user-list-item-${receiver.id}`));
  await page.waitForSelector(tid("transaction-create-form"));
  await page.fill("#amount", amount);
  await page.fill(input("transaction-create-description-input"), note);
  await page.click(tid(`transaction-create-submit-${type}`));
  const verb = type === "payment" ? "Paid" : "Requested";
  await page.getByText(new RegExp(`${verb} \\$`)).waitFor();
  const confirm = await page.getByText(new RegExp(`${verb} \\$`)).textContent();
  check(`confirmation reads "${verb} $${amount} for ${note}"`, confirm.includes(`${verb} $${amount}`) && confirm.includes(note), confirm);
  // One request writes the row, then (for payments) balances, status, and the notification.
  // Wait for the notification, the last write, before asserting anything.
  const tx = await poll(() => {
    const d = db(), t = d.transactions.find((x) => x.description === note);
    return t && d.notifications.some((x) => x.transactionId === t.id) && t;
  });
  check("transaction row and notification stored", !!tx, tx && tx.id);
  return tx;
}

async function openTransactionFromPersonalFeed(txId) {
  await page.click(tid("sidenav-home"));
  await page.getByRole("tab", { name: "Mine" }).click();
  await page.click(tid(`transaction-item-${txId}`));
  await page.waitForSelector(tid("transaction-detail-header"));
}

// Shared by request-accept and request-reject.
async function requestThenRespond(decision) {
  const requester = SEED.username;
  const note = `verify ${decision} ${Date.now().toString(36)}`;
  let tx, before;
  await step("requester creates request", async (check) => {
    await signInAs(requester);
    before = { requester: user(requester).balance, payee: user(PAYEE).balance };
    tx = await createViaWizard(check, { to: PAYEE, amount: "7", note, type: "request" });
    check("amount stored in cents (700)", tx.amount === 700, tx.amount);
    check("requestStatus pending", tx.requestStatus === "pending", tx.requestStatus);
    check("status pending", tx.status === "pending", tx.status);
    check("no money moved yet", user(requester).balance === before.requester && user(PAYEE).balance === before.payee);
    const notif = db().notifications.find((x) => x.transactionId === tx.id && x.userId === user(PAYEE).id);
    check("payee notified with status requested", notif && notif.status === "requested", notif && notif.status);
  });
  await step("requester sees no accept/reject", async (check) => {
    await page.goto(`${FRONTEND}/transaction/${tx.id}`);
    await page.waitForSelector(tid("transaction-detail-header"));
    check("no Accept button for requester", !(await page.isVisible(tid(`transaction-accept-request-${tx.id}`))));
  });
  await step("payee opens request from Mine feed", async (check) => {
    await signInAs(PAYEE);
    await openTransactionFromPersonalFeed(tx.id);
    check("on detail page", new URL(page.url()).pathname === `/transaction/${tx.id}`, page.url());
    check("Accept Request visible", await page.isVisible(tid(`transaction-accept-request-${tx.id}`)));
    check("Reject Request visible", await page.isVisible(tid(`transaction-reject-request-${tx.id}`)));
  });
  await step(`payee clicks ${decision === "accept" ? "Accept" : "Reject"} Request`, async (check) => {
    await page.click(tid(`transaction-${decision}-request-${tx.id}`));
    const want = decision === "accept" ? "accepted" : "rejected";
    const row = await poll(() => { const r = db().transactions.find((t) => t.id === tx.id); return r.requestStatus === want && r; });
    check(`requestStatus ${want}`, !!row, db().transactions.find((t) => t.id === tx.id).requestStatus);
    await page.waitForSelector(tid(`transaction-accept-request-${tx.id}`), { state: "detached", timeout: 5000 }).catch(() => {});
    check("buttons gone", !(await page.isVisible(tid(`transaction-accept-request-${tx.id}`))));
    const after = { requester: user(requester).balance, payee: user(PAYEE).balance };
    if (decision === "accept") {
      check("status complete", row && row.status === "complete", row && row.status);
      check("payee debited $7.00", after.payee === before.payee - 700, { before: before.payee, after: after.payee });
      check("requester credited $7.00", after.requester === before.requester + 700, { before: before.requester, after: after.requester });
      const notif = db().notifications.find((x) => x.transactionId === tx.id && x.userId === user(requester).id);
      check("requester notified with status received", notif && notif.status === "received", notif && notif.status);
    } else {
      check("payee balance unchanged", after.payee === before.payee, { before: before.payee, after: after.payee });
      check("requester balance unchanged", after.requester === before.requester, { before: before.requester, after: after.requester });
    }
  });
  await step("payee balance in sidenav after reload", async (check) => {
    await page.reload();
    const auth = await checkAuth();
    check("server session reports stored balance", auth.balance === user(PAYEE).balance, { server: auth.balance, stored: user(PAYEE).balance });
    check("sidenav shows stored balance", await sidenavBalanceIs(user(PAYEE).balance), await page.textContent(tid("sidenav-user-balance")));
  });
}

const journeys = {
  // Pay another user from the New wizard; money moves immediately.
  async pay() {
    const note = `verify pay ${Date.now().toString(36)}`;
    let tx, before;
    await step("payer signs in", async (check) => {
      await signInAs(SEED.username);
      before = { payer: user(SEED.username).balance, payee: user(PAYEE).balance };
      check("sidenav shows stored balance", await sidenavBalanceIs(before.payer), await page.textContent(tid("sidenav-user-balance")));
    });
    await step("pick receiver", async (check) => {
      await page.click(tid("nav-top-new-transaction"));
      await page.waitForSelector(tid("users-list"));
      check("payer is not offered as a receiver", !(await page.isVisible(tid(`user-list-item-${user(SEED.username).id}`))));
      await page.fill(tid("user-list-search-input"), user(PAYEE).firstName);
      await page.waitForSelector(tid(`user-list-item-${user(PAYEE).id}`));
      check("search finds payee", await page.isVisible(tid(`user-list-item-${user(PAYEE).id}`)));
      await page.goto(FRONTEND + "/"); // back out; createViaWizard drives the whole path
    });
    await step("submit payment", async (check) => {
      tx = await createViaWizard(check, { to: PAYEE, amount: "12", note, type: "payment" });
      check("amount stored in cents (1200)", tx.amount === 1200, tx.amount);
      check("status complete", tx.status === "complete", tx.status);
      check("not a request", !tx.requestStatus, tx.requestStatus);
      check("payer debited $12.00", user(SEED.username).balance === before.payer - 1200, { before: before.payer, after: user(SEED.username).balance });
      check("payee credited $12.00", user(PAYEE).balance === before.payee + 1200, { before: before.payee, after: user(PAYEE).balance });
      const notif = db().notifications.find((x) => x.transactionId === tx.id);
      check("payee notified with status received", notif && notif.userId === user(PAYEE).id && notif.status === "received", notif);
      check("sidenav balance refreshed", await sidenavBalanceIs(before.payer - 1200), await page.textContent(tid("sidenav-user-balance")));
    });
    await step("return to transactions and find it in Mine", async (check) => {
      await page.click(tid("new-transaction-return-to-transactions"));
      await page.waitForURL(FRONTEND + "/");
      await page.getByRole("tab", { name: "Mine" }).click();
      await page.waitForSelector(tid(`transaction-item-${tx.id}`));
      const amt = await page.textContent(tid(`transaction-amount-${tx.id}`));
      check("Mine feed shows -$12.00", amt.trim() === "-$12.00", amt);
    });
    await step("payee sees credit", async (check) => {
      await signInAs(PAYEE);
      check("payee sidenav shows credited balance", await sidenavBalanceIs(before.payee + 1200), await page.textContent(tid("sidenav-user-balance")));
    });
  },

  // Payment larger than the in-app balance: the shortfall is withdrawn from the payer's bank account.
  async "pay-insufficient"() {
    const note = `verify shortfall ${Date.now().toString(36)}`;
    const amountCents = 60000;
    let before;
    await step("low-balance payer signs in", async (check) => {
      await signInAs(LOW_BALANCE);
      before = { payer: user(LOW_BALANCE).balance, payee: user(SEED.username).balance };
      check(`precondition: ${LOW_BALANCE} balance < $600.00`, before.payer < amountCents, usd(before.payer));
    });
    await step("pay $600.00", async (check) => {
      const tx = await createViaWizard(check, { to: SEED.username, amount: "600", note, type: "payment" });
      check("status complete", tx.status === "complete", tx.status);
      check("payer balance now $0.00", user(LOW_BALANCE).balance === 0, user(LOW_BALANCE).balance);
      check("payee credited full $600.00", user(SEED.username).balance === before.payee + amountCents, { before: before.payee, after: user(SEED.username).balance });
      const transfer = db().banktransfers.find((b) => b.transactionId === tx.id);
      check("bank withdrawal row created", transfer && transfer.type === "withdrawal" && transfer.userId === user(LOW_BALANCE).id, transfer);
      check("withdrawal covers exactly the shortfall", transfer && transfer.amount === amountCents - before.payer, { shortfall: amountCents - before.payer, transfer: transfer && transfer.amount });
      check("sidenav shows $0.00", await sidenavBalanceIs(0), await page.textContent(tid("sidenav-user-balance")));
    });
  },

  // The amount field accepts cents ("$12.34"); the charge must keep them.
  async "pay-cents"() {
    const note = `verify cents ${Date.now().toString(36)}`;
    let before;
    await step("payer signs in", async () => {
      await signInAs(SEED.username);
      before = user(SEED.username).balance;
    });
    await step("pay $12.34", async (check) => {
      const tx = await createViaWizard(check, { to: PAYEE, amount: "12.34", note, type: "payment" });
      check("amount stored as 1234 cents", tx && tx.amount === 1234, tx && tx.amount);
      check("payer debited $12.34", user(SEED.username).balance === before - 1234, { before, after: user(SEED.username).balance });
    });
  },

  async "request-accept"() { await requestThenRespond("accept"); },
  async "request-reject"() { await requestThenRespond("reject"); },

  // List, add, and delete linked bank accounts from the Bank Accounts page (GraphQL-backed).
  async "bank-accounts"() {
    const name = `Verify Bank ${Date.now().toString(36)}`;
    let acct;
    await step("open Bank Accounts from sidenav", async (check) => {
      await signInAs(SEED.username);
      await page.click(tid("sidenav-bankaccounts"));
      await page.waitForSelector(tid("bankaccount-list"));
      check("on /bankaccounts", new URL(page.url()).pathname === "/bankaccounts", page.url());
      const mine = db().bankaccounts.filter((b) => b.userId === user(SEED.username).id);
      const items = await page.locator(`${tid("bankaccount-list")} [data-test^="bankaccount-list-item-"]`).count();
      check("list shows every stored account for this user", items === mine.length, { items, stored: mine.length });
    });
    await step("validation on new account form", async (check) => {
      await page.click(tid("bankaccount-new"));
      await page.waitForSelector(tid("bankaccount-form"));
      check("on /bankaccounts/new", new URL(page.url()).pathname === "/bankaccounts/new", page.url());
      await page.fill(input("bankaccount-bankName-input"), "abc");
      await page.fill(input("bankaccount-routingNumber-input"), "123");
      await page.locator(input("bankaccount-routingNumber-input")).blur();
      check("bank name min-length message", await page.getByText("Must contain at least 5 characters").isVisible());
      check("routing number message", await page.getByText("Must contain a valid routing number").isVisible());
      check("save disabled", await page.isDisabled(tid("bankaccount-submit")));
    });
    await step("create account", async (check) => {
      await page.fill(input("bankaccount-bankName-input"), name);
      await page.fill(input("bankaccount-routingNumber-input"), "987654321");
      await page.fill(input("bankaccount-accountNumber-input"), "1234567890");
      await page.click(tid("bankaccount-submit"));
      await page.waitForURL("**/bankaccounts");
      acct = await poll(() => db().bankaccounts.find((b) => b.bankName === name));
      check("row stored for this user", acct && acct.userId === user(SEED.username).id, acct && acct.userId);
      await page.waitForSelector(tid(`bankaccount-list-item-${acct && acct.id}`));
      check("new account listed", (await page.textContent(tid(`bankaccount-list-item-${acct.id}`))).includes(name));
    });
    await step("delete account", async (check) => {
      await page.locator(tid(`bankaccount-list-item-${acct.id}`)).locator(tid("bankaccount-delete")).click();
      const row = await poll(() => db().bankaccounts.find((b) => b.id === acct.id && b.isDeleted));
      check("row soft-deleted (isDeleted true)", !!row);
      await page.getByText(`${name} (Deleted)`).waitFor({ timeout: 5000 }).catch(() => {});
      const text = await page.textContent(tid(`bankaccount-list-item-${acct.id}`));
      check("list shows (Deleted)", text.includes("(Deleted)"), text);
      check("delete button gone for that account", (await page.locator(tid(`bankaccount-list-item-${acct.id}`)).locator(tid("bankaccount-delete")).count()) === 0);
    });
  },

  // Seeded user signs in with valid credentials and lands on the home feed.
  async signin() {
    await step("open signin", async (check) => {
      await page.goto(FRONTEND + "/signin");
      await page.waitForSelector(tid("signin-submit"));
      check("signin form rendered", await page.isVisible(input("signin-username")));
    });
    await step("submit valid credentials", async (check) => {
      await page.fill(input("signin-username"), SEED.username);
      await page.fill(input("signin-password"), SEED.password);
      await page.click(tid("signin-submit"));
      await page.waitForSelector(tid("sidenav-username"));
      check("landed on /", new URL(page.url()).pathname === "/", page.url());
      const shown = await page.textContent(tid("sidenav-username"));
      check("sidenav shows @username", shown.includes(SEED.username), shown);
      const expected = db().users.find((x) => x.username === SEED.username).firstName; // settings journey may have renamed it
      const full = await page.textContent(tid("sidenav-user-full-name"));
      check("sidenav shows the stored first name", full.includes(expected), full);
      const auth = await checkAuth();
      check("server session is authenticated as that user", auth.status === 200 && auth.username === SEED.username, auth);
    });
    await step("reload keeps session", async (check) => {
      await page.reload();
      await page.waitForSelector(tid("sidenav-username"));
      check("still signed in after reload", new URL(page.url()).pathname === "/", page.url());
    });
  },

  // Wrong password shows an error and creates no session; short password keeps submit disabled.
  async "signin-invalid"() {
    await step("wrong password", async (check) => {
      await signIn(SEED.username, "wrong-password");
      await page.waitForSelector(tid("signin-error"));
      const msg = await page.textContent(tid("signin-error"));
      check("error banner says invalid", /Username or password is invalid/.test(msg), msg);
      check("stays on /signin", new URL(page.url()).pathname === "/signin", page.url());
      const auth = await checkAuth();
      check("no server session", auth.status === 401, auth);
    });
    await step("password under 4 chars", async (check) => {
      await page.fill(input("signin-password"), "abc");
      await page.locator(input("signin-password")).blur();
      check("min-length message shown", await page.getByText("Password must contain at least 4 characters").isVisible());
      check("submit disabled", await page.isDisabled(tid("signin-submit")));
    });
    await step("unknown user", async (check) => {
      await signIn("no_such_user_xyz", SEED.password);
      await page.waitForSelector(tid("signin-error"));
      check("same generic error", /Username or password is invalid/.test(await page.textContent(tid("signin-error"))));
    });
  },

  // "Remember me" makes the session cookie persistent (30 days); without it the cookie dies with the browser.
  async "remember-me"(ctx) {
    const sidCookie = async () => (await ctx.cookies(BACKEND)).find((c) => c.name === "connect.sid");
    await step("sign in without remember me", async (check) => {
      await signIn(SEED.username, SEED.password);
      await page.waitForSelector(tid("sidenav-username"));
      const c = await sidCookie();
      check("connect.sid is a session cookie (expires -1)", c && c.expires === -1, c && c.expires);
    });
    await step("sign out", async () => {
      await page.click(tid("sidenav-signout"));
      await page.waitForURL("**/signin");
      await ctx.clearCookies();
    });
    await step("sign in with remember me", async (check) => {
      await signIn(SEED.username, SEED.password, { remember: true });
      await page.waitForSelector(tid("sidenav-username"));
      const c = await sidCookie();
      const days = c && c.expires > 0 ? (c.expires - Date.now() / 1000) / 86400 : null;
      check("connect.sid persists ~30 days", days !== null && days > 29 && days <= 30.01, days);
    });
  },

  // Sign out from the side nav ends the server session and re-guards private routes.
  async signout() {
    await step("sign in", async (check) => {
      await signIn(SEED.username, SEED.password);
      await page.waitForSelector(tid("sidenav-signout"));
      check("signed in", (await checkAuth()).status === 200);
    });
    await step("click sidenav Logout", async (check) => {
      await page.click(tid("sidenav-signout"));
      await page.waitForURL("**/signin");
      check("redirected to /signin", new URL(page.url()).pathname === "/signin", page.url());
      const auth = await checkAuth();
      check("server session gone", auth.status === 401, auth);
    });
    await step("revisit private route", async (check) => {
      await page.goto(FRONTEND + "/user/settings");
      await page.waitForSelector(tid("signin-submit"));
      check("bounced to /signin", new URL(page.url()).pathname === "/signin", page.url());
    });
  },

  // Anonymous visitors to private routes are sent to /signin.
  async guard() {
    for (const route of ["/", "/personal", "/user/settings", "/bankaccounts", "/notifications", "/transaction/new"]) {
      await step(`anonymous ${route}`, async (check) => {
        await page.goto(FRONTEND + route);
        await page.waitForSelector(tid("signin-submit"));
        check(`${route} redirects to /signin`, new URL(page.url()).pathname === "/signin", page.url());
      });
    }
  },

  // New user signs up, signs in, and completes the 3-step onboarding (creates a bank account).
  async "signup-onboarding"() {
    const u = `verify_${Date.now().toString(36)}`;
    const pw = "s3cret-verify";
    console.log(`  new username: ${u}`);
    await step("open signup by URL", async (check) => {
      await page.goto(FRONTEND + "/signup");
      await page.waitForSelector(tid("signup-title"));
      check("signup form rendered", await page.isVisible(input("signup-first-name")));
    });
    await step("mismatched confirm password", async (check) => {
      await page.fill(input("signup-first-name"), "Vera");
      await page.fill(input("signup-last-name"), "Fication");
      await page.fill(input("signup-username"), u);
      await page.fill(input("signup-password"), pw);
      await page.fill(input("signup-confirmPassword"), pw + "x");
      await page.locator(input("signup-confirmPassword")).blur();
      check("mismatch message shown", await page.getByText("Password does not match").isVisible());
      check("submit disabled", await page.isDisabled(tid("signup-submit")));
    });
    await step("submit valid signup", async (check) => {
      await page.fill(input("signup-confirmPassword"), pw);
      await page.click(tid("signup-submit"));
      await page.waitForURL("**/signin");
      check("redirected to /signin", new URL(page.url()).pathname === "/signin", page.url());
      const row = db().users.find((x) => x.username === u);
      check("user row written to data/database.json", !!row, row && { id: row.id, firstName: row.firstName });
      check("password stored as bcrypt hash", row && /^\$2[aby]\$/.test(row.password) && row.password !== pw);
      check("signup does not create a session", (await checkAuth()).status === 401);
    });
    await step("first sign in shows onboarding", async (check) => {
      await signIn(u, pw);
      await page.waitForSelector(tid("user-onboarding-dialog"));
      const title = await page.textContent(tid("user-onboarding-dialog-title"));
      check("step 1 title", /Get Started with Real World App/.test(title), title);
    });
    await step("onboarding step 2 bank account", async (check) => {
      await page.click(tid("user-onboarding-next"));
      await page.waitForSelector(tid("bankaccount-form"));
      check("step 2 title", /Create Bank Account/.test(await page.textContent(tid("user-onboarding-dialog-title"))));
      await page.fill(input("bankaccount-bankName-input"), "Verify Bank");
      await page.fill(input("bankaccount-routingNumber-input"), "987654321");
      await page.fill(input("bankaccount-accountNumber-input"), "123456789");
      await page.click(tid("bankaccount-submit"));
      await page.waitForFunction(
        (sel) => /Finished/.test(document.querySelector(sel)?.textContent || ""),
        tid("user-onboarding-dialog-title"),
      );
      // The dialog advances to "Finished" before the create request returns, so poll the DB.
      const userId = db().users.find((x) => x.username === u).id;
      let acct;
      for (let i = 0; i < 20 && !acct; i++, await page.waitForTimeout(250)) {
        acct = db().bankaccounts.find((b) => b.userId === userId);
      }
      check("bank account row written for new user", acct && acct.bankName === "Verify Bank", acct && acct.bankName);
    });
    await step("finish onboarding", async (check) => {
      await page.click(tid("user-onboarding-next"));
      await page.waitForSelector(tid("user-onboarding-dialog"), { state: "detached" });
      check("dialog closed", !(await page.isVisible(tid("user-onboarding-dialog"))));
      const shown = await page.textContent(tid("sidenav-username"));
      check("signed in as new user", shown.includes(u), shown);
    });
    await step("onboarding does not return after reload", async (check) => {
      await page.reload();
      await page.waitForSelector(tid("sidenav-username"));
      await page.waitForTimeout(1500); // dialog opens async after bank accounts load
      check("no onboarding dialog", !(await page.isVisible(tid("user-onboarding-dialog"))));
    });
  },

  // The "Don't have an account? Sign Up" link on /signin opens /signup with one click.
  async "signup-link"() {
    await step("click Sign Up link once", async (check) => {
      await page.goto(FRONTEND + "/signin");
      await page.waitForSelector(tid("signup"));
      await page.click(tid("signup"));
      await page.waitForTimeout(1000);
      check("first click navigates to /signup", new URL(page.url()).pathname === "/signup", page.url());
    });
  },

  // Signed-in user edits profile fields; the change persists server-side and across reload.
  async settings() {
    const newFirst = `Ted${Date.now().toString(36).slice(-4)}`;
    await step("open settings from sidenav", async (check) => {
      await signIn(SEED.username, SEED.password);
      await page.click(tid("sidenav-user-settings"));
      await page.waitForSelector(tid("user-settings-form"));
      check("on /user/settings", new URL(page.url()).pathname === "/user/settings", page.url());
      const stored = db().users.find((x) => x.username === SEED.username).firstName;
      check("form prefilled with stored first name", (await page.inputValue(tid("user-settings-firstName-input"))) === stored);
    });
    await step("invalid email blocks save", async (check) => {
      await page.fill(tid("user-settings-email-input"), "not-an-email");
      await page.locator(tid("user-settings-email-input")).blur();
      check("email message shown", await page.getByText("Must contain a valid email address").isVisible());
      check("save disabled", await page.isDisabled(tid("user-settings-submit")));
      await page.fill(tid("user-settings-email-input"), "ted@example.com");
    });
    await step("save new first name", async (check) => {
      await page.fill(tid("user-settings-firstName-input"), newFirst);
      await page.click(tid("user-settings-submit"));
      await page.waitForFunction(
        ([sel, v]) => (document.querySelector(sel)?.textContent || "").includes(v),
        [tid("sidenav-user-full-name"), newFirst],
      );
      const row = db().users.find((x) => x.username === SEED.username);
      check("firstName updated in data/database.json", row.firstName === newFirst, row.firstName);
      check("email updated in data/database.json", row.email === "ted@example.com", row.email);
      check("sidenav shows new name", (await page.textContent(tid("sidenav-user-full-name"))).includes(newFirst));
    });
    await step("reload shows persisted value", async (check) => {
      await page.reload();
      await page.waitForSelector(tid("user-settings-form"));
      check("form shows saved first name", (await page.inputValue(tid("user-settings-firstName-input"))) === newFirst);
    });
  },
};

(async () => {
  if (!journeys[journey]) {
    console.error(`usage: drive.sh <journey> [--headed]\njourneys: ${Object.keys(journeys).join(", ")}`);
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  browser = await chromium.launch({ headless: !headed });
  await newSession();
  try {
    await journeys[journey](ctx);
  } finally {
    fs.writeFileSync(
      path.join(outDir, "steps.json"),
      JSON.stringify({ journey, runId, passed: !failed, steps, consoleErrors }, null, 2),
    );
    await browser.close();
  }
  console.log(`${failed ? "FAILED" : "PASSED"} ${journey}  evidence: ${outDir}`);
  process.exit(failed ? 1 : 0);
})();
