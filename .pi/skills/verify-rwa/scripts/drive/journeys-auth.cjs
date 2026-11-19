const { FRONTEND, BACKEND, SEED } = require("./config.cjs");
const { step } = require("./recorder.cjs");
const { page, db, tid, input, pathnameIs, checkAuth, signIn } = require("./helpers.cjs");

const SESSION_COOKIE = "connect.sid";
const SECONDS_PER_DAY = 86400;
const PRIVATE_ROUTES = [
  "/",
  "/personal",
  "/user/settings",
  "/bankaccounts",
  "/notifications",
  "/transaction/new",
];
const INVALID_LOGIN = /Username or password is invalid/;

async function openSignin(check) {
  await page.goto(FRONTEND + "/signin");
  await page.waitForSelector(tid("signin-submit"));
  check("signin form rendered", await page.isVisible(input("signin-username")));
}

async function submitValidCredentials(check) {
  await page.fill(input("signin-username"), SEED.username);
  await page.fill(input("signin-password"), SEED.password);
  await page.click(tid("signin-submit"));
  await page.waitForSelector(tid("sidenav-username"));
  check("landed on /", pathnameIs("/"), page.url());
  const shown = await page.textContent(tid("sidenav-username"));
  check("sidenav shows @username", shown.includes(SEED.username), shown);
  const expected = db().users.find((x) => x.username === SEED.username).firstName; // settings journey may have renamed it
  const full = await page.textContent(tid("sidenav-user-full-name"));
  check("sidenav shows the stored first name", full.includes(expected), full);
  const auth = await checkAuth();
  check(
    "server session is authenticated as that user",
    auth.status === 200 && auth.username === SEED.username,
    auth
  );
}

async function reloadKeepsSession(check) {
  await page.reload();
  await page.waitForSelector(tid("sidenav-username"));
  check("still signed in after reload", pathnameIs("/"), page.url());
}

// Seeded user signs in with valid credentials and lands on the home feed.
async function signin() {
  await step("open signin", openSignin);
  await step("submit valid credentials", submitValidCredentials);
  await step("reload keeps session", reloadKeepsSession);
}

async function wrongPassword(check) {
  await signIn(SEED.username, "wrong-password");
  await page.waitForSelector(tid("signin-error"));
  const msg = await page.textContent(tid("signin-error"));
  check("error banner says invalid", INVALID_LOGIN.test(msg), msg);
  check("stays on /signin", pathnameIs("/signin"), page.url());
  const auth = await checkAuth();
  check("no server session", auth.status === 401, auth);
}

async function shortPassword(check) {
  await page.fill(input("signin-password"), "abc");
  await page.locator(input("signin-password")).blur();
  check(
    "min-length message shown",
    await page.getByText("Password must contain at least 4 characters").isVisible()
  );
  check("submit disabled", await page.isDisabled(tid("signin-submit")));
}

async function unknownUser(check) {
  await signIn("no_such_user_xyz", SEED.password);
  await page.waitForSelector(tid("signin-error"));
  check("same generic error", INVALID_LOGIN.test(await page.textContent(tid("signin-error"))));
}

// Wrong password shows an error and creates no session; short password keeps submit disabled.
async function signinInvalid() {
  await step("wrong password", wrongPassword);
  await step("password under 4 chars", shortPassword);
  await step("unknown user", unknownUser);
}

// "Remember me" makes the session cookie persistent (30 days); without it the cookie dies with the browser.
async function rememberMe(ctx) {
  const sidCookie = async () => (await ctx.cookies(BACKEND)).find((c) => c.name === SESSION_COOKIE);
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
    const days = c && c.expires > 0 ? (c.expires - Date.now() / 1000) / SECONDS_PER_DAY : null;
    check("connect.sid persists ~30 days", days !== null && days > 29 && days <= 30.01, days);
  });
}

// Sign out from the side nav ends the server session and re-guards private routes.
async function signout() {
  await step("sign in", async (check) => {
    await signIn(SEED.username, SEED.password);
    await page.waitForSelector(tid("sidenav-signout"));
    check("signed in", (await checkAuth()).status === 200);
  });
  await step("click sidenav Logout", async (check) => {
    await page.click(tid("sidenav-signout"));
    await page.waitForURL("**/signin");
    check("redirected to /signin", pathnameIs("/signin"), page.url());
    const auth = await checkAuth();
    check("server session gone", auth.status === 401, auth);
  });
  await step("revisit private route", async (check) => {
    await page.goto(FRONTEND + "/user/settings");
    await page.waitForSelector(tid("signin-submit"));
    check("bounced to /signin", pathnameIs("/signin"), page.url());
  });
}

// Anonymous visitors to private routes are sent to /signin.
async function guard() {
  for (const route of PRIVATE_ROUTES) {
    await step(`anonymous ${route}`, async (check) => {
      await page.goto(FRONTEND + route);
      await page.waitForSelector(tid("signin-submit"));
      check(`${route} redirects to /signin`, pathnameIs("/signin"), page.url());
    });
  }
}

module.exports = {
  signin,
  "signin-invalid": signinInvalid,
  "remember-me": rememberMe,
  signout,
  guard,
};
