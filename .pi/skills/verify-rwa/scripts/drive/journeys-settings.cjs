const { SEED } = require("./config.cjs");
const { step } = require("./recorder.cjs");
const { page, db, tid, pathnameIs, signIn } = require("./helpers.cjs");

const NEW_EMAIL = "ted@example.com";

async function openSettings(check) {
  await signIn(SEED.username, SEED.password);
  await page.click(tid("sidenav-user-settings"));
  await page.waitForSelector(tid("user-settings-form"));
  check("on /user/settings", pathnameIs("/user/settings"), page.url());
  const stored = db().users.find((x) => x.username === SEED.username).firstName;
  check(
    "form prefilled with stored first name",
    (await page.inputValue(tid("user-settings-firstName-input"))) === stored
  );
}

async function invalidEmailBlocksSave(check) {
  await page.fill(tid("user-settings-email-input"), "not-an-email");
  await page.locator(tid("user-settings-email-input")).blur();
  check(
    "email message shown",
    await page.getByText("Must contain a valid email address").isVisible()
  );
  check("save disabled", await page.isDisabled(tid("user-settings-submit")));
  await page.fill(tid("user-settings-email-input"), NEW_EMAIL);
}

async function saveNewFirstName(check, newFirst) {
  await page.fill(tid("user-settings-firstName-input"), newFirst);
  await page.click(tid("user-settings-submit"));
  await page.waitForFunction(
    ([sel, v]) => (document.querySelector(sel)?.textContent || "").includes(v),
    [tid("sidenav-user-full-name"), newFirst]
  );
  const row = db().users.find((x) => x.username === SEED.username);
  check("firstName updated in data/database.json", row.firstName === newFirst, row.firstName);
  check("email updated in data/database.json", row.email === NEW_EMAIL, row.email);
  check(
    "sidenav shows new name",
    (await page.textContent(tid("sidenav-user-full-name"))).includes(newFirst)
  );
}

async function reloadShowsPersisted(check, newFirst) {
  await page.reload();
  await page.waitForSelector(tid("user-settings-form"));
  check(
    "form shows saved first name",
    (await page.inputValue(tid("user-settings-firstName-input"))) === newFirst
  );
}

// Signed-in user edits profile fields; the change persists server-side and across reload.
async function settings() {
  const newFirst = `Ted${Date.now().toString(36).slice(-4)}`;
  await step("open settings from sidenav", openSettings);
  await step("invalid email blocks save", invalidEmailBlocksSave);
  await step("save new first name", (check) => saveNewFirstName(check, newFirst));
  await step("reload shows persisted value", (check) => reloadShowsPersisted(check, newFirst));
}

module.exports = { settings };
