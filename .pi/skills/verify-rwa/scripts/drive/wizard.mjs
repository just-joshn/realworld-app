import { SEED, PAYEE } from "./config.mjs";
import {
  page,
  db,
  tid,
  input,
  user,
  pathnameIs,
  poll,
  sidenavBalanceIs,
  sidenavBalanceText,
} from "./helpers.mjs";

const paidVerb = (type) => (type === "payment" ? "Paid" : "Requested");

async function fillWizard(receiver, { amount, note, type }) {
  await page.fill(tid("user-list-search-input"), receiver.firstName);
  await page.click(tid(`user-list-item-${receiver.id}`));
  await page.waitForSelector(tid("transaction-create-form"));
  await page.fill("#amount", amount);
  await page.fill(input("transaction-create-description-input"), note);
  await page.click(tid(`transaction-create-submit-${type}`));
}

async function checkConfirmation(check, { amount, note, type }) {
  const verb = paidVerb(type);
  await page.getByText(new RegExp(`${verb} \\$`)).waitFor();
  const confirm = await page.getByText(new RegExp(`${verb} \\$`)).textContent();
  check(
    `confirmation reads "${verb} $${amount} for ${note}"`,
    confirm.includes(`${verb} $${amount}`) && confirm.includes(note),
    confirm
  );
}

// One request writes the row, then (for payments) balances, status, and the notification.
// Wait for the notification, the last write, before asserting anything.
const waitForStoredTransaction = (note) =>
  poll(() => {
    const data = db();
    const stored = data.transactions.find((x) => x.description === note);
    return stored && data.notifications.some((x) => x.transactionId === stored.id) && stored;
  });

// The New -> pick user -> amount/note -> Pay|Request wizard. Returns the stored transaction.
async function createViaWizard(check, { to, amount, note, type }) {
  const receiver = user(to);
  await page.click(tid("nav-top-new-transaction"));
  await page.waitForSelector(tid("users-list"));
  check("wizard opened at /transaction/new", pathnameIs("/transaction/new"), page.url());
  await fillWizard(receiver, { amount, note, type });
  await checkConfirmation(check, { amount, note, type });
  const tx = await waitForStoredTransaction(note);
  check("transaction row and notification stored", !!tx, tx && tx.id);
  return tx;
}

async function openTransactionFromPersonalFeed(txId) {
  await page.click(tid("sidenav-home"));
  await page.getByRole("tab", { name: "Mine" }).click();
  await page.click(tid(`transaction-item-${txId}`));
  await page.waitForSelector(tid("transaction-detail-header"));
}

const balanceCheck = async (check, desc, cents) =>
  check(desc, await sidenavBalanceIs(cents), await sidenavBalanceText());

const payerAndPayee = () => ({ payer: user(SEED.username).balance, payee: user(PAYEE).balance });

export { createViaWizard, openTransactionFromPersonalFeed, balanceCheck, payerAndPayee };
