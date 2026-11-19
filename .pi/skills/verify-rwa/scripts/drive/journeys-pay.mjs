import { FRONTEND, SEED, PAYEE, LOW_BALANCE } from "./config.mjs";
import { step } from "./recorder.mjs";
import { page, db, tid, user, usd, signInAs } from "./helpers.mjs";
import { createViaWizard, balanceCheck, payerAndPayee } from "./wizard.mjs";

const PAY_CENTS = 1200;
const SHORTFALL_PAYMENT_CENTS = 60000;
const CENTS_PAYMENT = 1234;
const stamp = () => Date.now().toString(36);

async function payerSignsIn(check) {
  await signInAs(SEED.username);
  const before = payerAndPayee();
  await balanceCheck(check, "sidenav shows stored balance", before.payer);
  return before;
}

async function pickReceiver(check) {
  await page.click(tid("nav-top-new-transaction"));
  await page.waitForSelector(tid("users-list"));
  check(
    "payer is not offered as a receiver",
    !(await page.isVisible(tid(`user-list-item-${user(SEED.username).id}`)))
  );
  await page.fill(tid("user-list-search-input"), user(PAYEE).firstName);
  await page.waitForSelector(tid(`user-list-item-${user(PAYEE).id}`));
  check("search finds payee", await page.isVisible(tid(`user-list-item-${user(PAYEE).id}`)));
  await page.goto(FRONTEND + "/"); // back out; createViaWizard drives the whole path
}

function checkPaymentRow(check, tx) {
  check("amount stored in cents (1200)", tx.amount === PAY_CENTS, tx.amount);
  check("status complete", tx.status === "complete", tx.status);
  check("not a request", !tx.requestStatus, tx.requestStatus);
}

function checkPaymentBalances(check, before) {
  check("payer debited $12.00", user(SEED.username).balance === before.payer - PAY_CENTS, {
    before: before.payer,
    after: user(SEED.username).balance,
  });
  check("payee credited $12.00", user(PAYEE).balance === before.payee + PAY_CENTS, {
    before: before.payee,
    after: user(PAYEE).balance,
  });
}

async function submitPayment(check, { note, before }) {
  const tx = await createViaWizard(check, { to: PAYEE, amount: "12", note, type: "payment" });
  checkPaymentRow(check, tx);
  checkPaymentBalances(check, before);
  const notif = db().notifications.find((x) => x.transactionId === tx.id);
  check(
    "payee notified with status received",
    notif && notif.userId === user(PAYEE).id && notif.status === "received",
    notif
  );
  await balanceCheck(check, "sidenav balance refreshed", before.payer - PAY_CENTS);
  return tx;
}

async function findInMine(check, tx) {
  await page.click(tid("new-transaction-return-to-transactions"));
  await page.waitForURL(FRONTEND + "/");
  await page.getByRole("tab", { name: "Mine" }).click();
  await page.waitForSelector(tid(`transaction-item-${tx.id}`));
  const amt = await page.textContent(tid(`transaction-amount-${tx.id}`));
  check("Mine feed shows -$12.00", amt.trim() === "-$12.00", amt);
}

// Pay another user from the New wizard; money moves immediately.
async function pay() {
  const note = `verify pay ${stamp()}`;
  const before = await step("payer signs in", payerSignsIn);
  await step("pick receiver", pickReceiver);
  const tx = await step("submit payment", (check) => submitPayment(check, { note, before }));
  await step("return to transactions and find it in Mine", (check) => findInMine(check, tx));
  await step("payee sees credit", async (check) => {
    await signInAs(PAYEE);
    await balanceCheck(check, "payee sidenav shows credited balance", before.payee + PAY_CENTS);
  });
}

async function lowBalancePayerSignsIn(check) {
  await signInAs(LOW_BALANCE);
  const before = { payer: user(LOW_BALANCE).balance, payee: user(SEED.username).balance };
  check(
    `precondition: ${LOW_BALANCE} balance < $600.00`,
    before.payer < SHORTFALL_PAYMENT_CENTS,
    usd(before.payer)
  );
  return before;
}

function checkWithdrawal(check, { tx, before }) {
  const transfer = db().banktransfers.find((b) => b.transactionId === tx.id);
  check(
    "bank withdrawal row created",
    transfer && transfer.type === "withdrawal" && transfer.userId === user(LOW_BALANCE).id,
    transfer
  );
  check(
    "withdrawal covers exactly the shortfall",
    transfer && transfer.amount === SHORTFALL_PAYMENT_CENTS - before.payer,
    { shortfall: SHORTFALL_PAYMENT_CENTS - before.payer, transfer: transfer && transfer.amount }
  );
}

async function payShortfall(check, { note, before }) {
  const tx = await createViaWizard(check, {
    to: SEED.username,
    amount: "600",
    note,
    type: "payment",
  });
  check("status complete", tx.status === "complete", tx.status);
  check("payer balance now $0.00", user(LOW_BALANCE).balance === 0, user(LOW_BALANCE).balance);
  check(
    "payee credited full $600.00",
    user(SEED.username).balance === before.payee + SHORTFALL_PAYMENT_CENTS,
    { before: before.payee, after: user(SEED.username).balance }
  );
  checkWithdrawal(check, { tx, before });
  await balanceCheck(check, "sidenav shows $0.00", 0);
}

// Payment larger than the in-app balance: the shortfall is withdrawn from the payer's bank account.
async function payInsufficient() {
  const note = `verify shortfall ${stamp()}`;
  const before = await step("low-balance payer signs in", lowBalancePayerSignsIn);
  await step("pay $600.00", (check) => payShortfall(check, { note, before }));
}

async function payCentsStep(check, { note, before }) {
  const tx = await createViaWizard(check, { to: PAYEE, amount: "12.34", note, type: "payment" });
  check("amount stored as 1234 cents", tx && tx.amount === CENTS_PAYMENT, tx && tx.amount);
  check("payer debited $12.34", user(SEED.username).balance === before - CENTS_PAYMENT, {
    before,
    after: user(SEED.username).balance,
  });
}

// The amount field accepts cents ("$12.34"); the charge must keep them.
async function payCents() {
  const note = `verify cents ${stamp()}`;
  const before = await step("payer signs in", async () => {
    await signInAs(SEED.username);
    return user(SEED.username).balance;
  });
  await step("pay $12.34", (check) => payCentsStep(check, { note, before }));
}

export const journeys = { pay, "pay-insufficient": payInsufficient, "pay-cents": payCents };
