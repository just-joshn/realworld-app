import { FRONTEND } from "./config.mjs";
import { step, out } from "./recorder.mjs";
import { page, db, tid, input, pathnameIs, checkAuth, signIn, poll } from "./helpers.mjs";

const NEW_USER_PASSWORD = "s3cret-verify";
const BANK_NAME = "Verify Bank";
const POST_RELOAD_WAIT_MS = 1500;

async function openSignup(check) {
  await page.goto(FRONTEND + "/signup");
  await page.waitForSelector(tid("signup-title"));
  check("signup form rendered", await page.isVisible(input("signup-first-name")));
}

async function mismatchedPassword(check, { username, password }) {
  await page.fill(input("signup-first-name"), "Vera");
  await page.fill(input("signup-last-name"), "Fication");
  await page.fill(input("signup-username"), username);
  await page.fill(input("signup-password"), password);
  await page.fill(input("signup-confirmPassword"), password + "x");
  await page.locator(input("signup-confirmPassword")).blur();
  check("mismatch message shown", await page.getByText("Password does not match").isVisible());
  check("submit disabled", await page.isDisabled(tid("signup-submit")));
}

async function submitValidSignup(check, { username, password }) {
  await page.fill(input("signup-confirmPassword"), password);
  await page.click(tid("signup-submit"));
  await page.waitForURL("**/signin");
  check("redirected to /signin", pathnameIs("/signin"), page.url());
  const row = db().users.find((x) => x.username === username);
  check(
    "user row written to data/database.json",
    !!row,
    row && { id: row.id, firstName: row.firstName }
  );
  check(
    "password stored as bcrypt hash",
    row && /^\$2[aby]\$/.test(row.password) && row.password !== password
  );
  check("signup does not create a session", (await checkAuth()).status === 401);
}

async function firstSignInShowsOnboarding(check, { username, password }) {
  await signIn(username, password);
  await page.waitForSelector(tid("user-onboarding-dialog"));
  const title = await page.textContent(tid("user-onboarding-dialog-title"));
  check("step 1 title", /Get Started with Real World App/.test(title), title);
}

async function createOnboardingBankAccount(check, username) {
  await page.click(tid("user-onboarding-next"));
  await page.waitForSelector(tid("bankaccount-form"));
  check(
    "step 2 title",
    /Create Bank Account/.test(await page.textContent(tid("user-onboarding-dialog-title")))
  );
  await page.fill(input("bankaccount-bankName-input"), BANK_NAME);
  await page.fill(input("bankaccount-routingNumber-input"), "987654321");
  await page.fill(input("bankaccount-accountNumber-input"), "123456789");
  await page.click(tid("bankaccount-submit"));
  await page.waitForFunction(
    (sel) => /Finished/.test(document.querySelector(sel)?.textContent || ""),
    tid("user-onboarding-dialog-title")
  );
  // The dialog advances to "Finished" before the create request returns, so poll the DB.
  const userId = db().users.find((x) => x.username === username).id;
  const acct = await poll(() => db().bankaccounts.find((b) => b.userId === userId));
  check(
    "bank account row written for new user",
    acct && acct.bankName === BANK_NAME,
    acct && acct.bankName
  );
}

async function finishOnboarding(check, username) {
  await page.click(tid("user-onboarding-next"));
  await page.waitForSelector(tid("user-onboarding-dialog"), { state: "detached" });
  check("dialog closed", !(await page.isVisible(tid("user-onboarding-dialog"))));
  const shown = await page.textContent(tid("sidenav-username"));
  check("signed in as new user", shown.includes(username), shown);
}

async function onboardingStaysClosed(check) {
  await page.reload();
  await page.waitForSelector(tid("sidenav-username"));
  await page.waitForTimeout(POST_RELOAD_WAIT_MS); // dialog opens async after bank accounts load
  check("no onboarding dialog", !(await page.isVisible(tid("user-onboarding-dialog"))));
}

// New user signs up, signs in, and completes the 3-step onboarding (creates a bank account).
async function signupOnboarding() {
  const account = {
    username: `verify_${Date.now().toString(36)}`,
    password: NEW_USER_PASSWORD,
  };
  out(`  new username: ${account.username}`);
  await step("open signup by URL", openSignup);
  await step("mismatched confirm password", (check) => mismatchedPassword(check, account));
  await step("submit valid signup", (check) => submitValidSignup(check, account));
  await step("first sign in shows onboarding", (check) =>
    firstSignInShowsOnboarding(check, account)
  );
  await step("onboarding step 2 bank account", (check) =>
    createOnboardingBankAccount(check, account.username)
  );
  await step("finish onboarding", (check) => finishOnboarding(check, account.username));
  await step("onboarding does not return after reload", onboardingStaysClosed);
}

// The "Don't have an account? Sign Up" link on /signin opens /signup with one click.
async function signupLink() {
  await step("click Sign Up link once", async (check) => {
    await page.goto(FRONTEND + "/signin");
    await page.waitForSelector(tid("signup"));
    await page.click(tid("signup"));
    await page.waitForTimeout(1000);
    check("first click navigates to /signup", pathnameIs("/signup"), page.url());
  });
}

export const journeys = { "signup-onboarding": signupOnboarding, "signup-link": signupLink };
