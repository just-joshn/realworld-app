import { SEED } from "./config.mjs";
import { step, bestEffort } from "./recorder.mjs";
import { page, db, tid, input, user, pathnameIs, poll, signInAs } from "./helpers.mjs";

const ITEM_PREFIX = "bankaccount-list-item-";
const itemOf = (acct) => page.locator(tid(`${ITEM_PREFIX}${acct.id}`));

async function openBankAccounts(check) {
  await signInAs(SEED.username);
  await page.click(tid("sidenav-bankaccounts"));
  await page.waitForSelector(tid("bankaccount-list"));
  check("on /bankaccounts", pathnameIs("/bankaccounts"), page.url());
  const mine = db().bankaccounts.filter((b) => b.userId === user(SEED.username).id);
  const items = await page
    .locator(`${tid("bankaccount-list")} [data-test^="${ITEM_PREFIX}"]`)
    .count();
  check("list shows every stored account for this user", items === mine.length, {
    items,
    stored: mine.length,
  });
}

async function validateNewAccountForm(check) {
  await page.click(tid("bankaccount-new"));
  await page.waitForSelector(tid("bankaccount-form"));
  check("on /bankaccounts/new", pathnameIs("/bankaccounts/new"), page.url());
  await page.fill(input("bankaccount-bankName-input"), "abc");
  await page.fill(input("bankaccount-routingNumber-input"), "123");
  await page.locator(input("bankaccount-routingNumber-input")).blur();
  check(
    "bank name min-length message",
    await page.getByText("Must contain at least 5 characters").isVisible()
  );
  check(
    "routing number message",
    await page.getByText("Must contain a valid routing number").isVisible()
  );
  check("save disabled", await page.isDisabled(tid("bankaccount-submit")));
}

async function createAccount(check, name) {
  await page.fill(input("bankaccount-bankName-input"), name);
  await page.fill(input("bankaccount-routingNumber-input"), "987654321");
  await page.fill(input("bankaccount-accountNumber-input"), "1234567890");
  await page.click(tid("bankaccount-submit"));
  await page.waitForURL("**/bankaccounts");
  const acct = await poll(() => db().bankaccounts.find((b) => b.bankName === name));
  check(
    "row stored for this user",
    acct && acct.userId === user(SEED.username).id,
    acct && acct.userId
  );
  await page.waitForSelector(tid(`${ITEM_PREFIX}${acct && acct.id}`));
  check("new account listed", (await itemOf(acct).textContent()).includes(name));
  return acct;
}

async function deleteAccount(check, { acct, name }) {
  await itemOf(acct).locator(tid("bankaccount-delete")).click();
  const row = await poll(() => db().bankaccounts.find((b) => b.id === acct.id && b.isDeleted));
  check("row soft-deleted (isDeleted true)", !!row);
  await bestEffort(
    page.getByText(`${name} (Deleted)`).waitFor({ timeout: 5000 }),
    "(Deleted) label"
  );
  const text = await page.textContent(tid(`${ITEM_PREFIX}${acct.id}`));
  check("list shows (Deleted)", text.includes("(Deleted)"), text);
  check(
    "delete button gone for that account",
    (await itemOf(acct).locator(tid("bankaccount-delete")).count()) === 0
  );
}

// List, add, and delete linked bank accounts from the Bank Accounts page (GraphQL-backed).
async function bankAccounts() {
  const name = `Verify Bank ${Date.now().toString(36)}`;
  await step("open Bank Accounts from sidenav", openBankAccounts);
  await step("validation on new account form", validateNewAccountForm);
  const acct = await step("create account", (check) => createAccount(check, name));
  await step("delete account", (check) => deleteAccount(check, { acct, name }));
}

export const journeys = { "bank-accounts": bankAccounts };
