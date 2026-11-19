const { FRONTEND, SEED, PAYEE } = require("./config.cjs");
const { step, bestEffort } = require("./recorder.cjs");
const {
  page,
  db,
  tid,
  user,
  pathnameIs,
  checkAuth,
  signInAs,
  poll,
  sidenavBalanceIs,
} = require("./helpers.cjs");
const { createViaWizard, openTransactionFromPersonalFeed } = require("./wizard.cjs");

const REQUEST_CENTS = 700;
const acceptButton = (tx) => tid(`transaction-accept-request-${tx.id}`);
const rejectButton = (tx) => tid(`transaction-reject-request-${tx.id}`);
const balances = () => ({ requester: user(SEED.username).balance, payee: user(PAYEE).balance });
const storedTx = (tx) => db().transactions.find((t) => t.id === tx.id);

async function requesterCreatesRequest(check, note) {
  await signInAs(SEED.username);
  const before = balances();
  const tx = await createViaWizard(check, { to: PAYEE, amount: "7", note, type: "request" });
  check("amount stored in cents (700)", tx.amount === REQUEST_CENTS, tx.amount);
  check("requestStatus pending", tx.requestStatus === "pending", tx.requestStatus);
  check("status pending", tx.status === "pending", tx.status);
  const after = balances();
  check("no money moved yet", after.requester === before.requester && after.payee === before.payee);
  const notif = db().notifications.find(
    (x) => x.transactionId === tx.id && x.userId === user(PAYEE).id
  );
  check(
    "payee notified with status requested",
    notif && notif.status === "requested",
    notif && notif.status
  );
  return { tx, before };
}

async function requesterSeesNoButtons(check, tx) {
  await page.goto(`${FRONTEND}/transaction/${tx.id}`);
  await page.waitForSelector(tid("transaction-detail-header"));
  check("no Accept button for requester", !(await page.isVisible(acceptButton(tx))));
}

async function payeeOpensRequest(check, tx) {
  await signInAs(PAYEE);
  await openTransactionFromPersonalFeed(tx.id);
  check("on detail page", pathnameIs(`/transaction/${tx.id}`), page.url());
  check("Accept Request visible", await page.isVisible(acceptButton(tx)));
  check("Reject Request visible", await page.isVisible(rejectButton(tx)));
}

function checkAccepted(check, { tx, before, after, row }) {
  check("status complete", row && row.status === "complete", row && row.status);
  check("payee debited $7.00", after.payee === before.payee - REQUEST_CENTS, {
    before: before.payee,
    after: after.payee,
  });
  check("requester credited $7.00", after.requester === before.requester + REQUEST_CENTS, {
    before: before.requester,
    after: after.requester,
  });
  const notif = db().notifications.find(
    (x) => x.transactionId === tx.id && x.userId === user(SEED.username).id
  );
  check(
    "requester notified with status received",
    notif && notif.status === "received",
    notif && notif.status
  );
}

function checkRejected(check, { before, after }) {
  check("payee balance unchanged", after.payee === before.payee, {
    before: before.payee,
    after: after.payee,
  });
  check("requester balance unchanged", after.requester === before.requester, {
    before: before.requester,
    after: after.requester,
  });
}

async function payeeResponds(check, { decision, tx, before }) {
  await page.click(tid(`transaction-${decision}-request-${tx.id}`));
  const want = decision === "accept" ? "accepted" : "rejected";
  const row = await poll(() => {
    const r = storedTx(tx);
    return r.requestStatus === want && r;
  });
  check(`requestStatus ${want}`, !!row, storedTx(tx).requestStatus);
  await bestEffort(
    page.waitForSelector(acceptButton(tx), { state: "detached", timeout: 5000 }),
    "request buttons detaching"
  );
  check("buttons gone", !(await page.isVisible(acceptButton(tx))));
  const outcome = { tx, before, after: balances(), row };
  if (decision === "accept") checkAccepted(check, outcome);
  else checkRejected(check, outcome);
}

async function balanceAfterReload(check) {
  await page.reload();
  const auth = await checkAuth();
  const stored = user(PAYEE).balance;
  check("server session reports stored balance", auth.balance === stored, {
    server: auth.balance,
    stored,
  });
  check(
    "sidenav shows stored balance",
    await sidenavBalanceIs(stored),
    await page.textContent(tid("sidenav-user-balance"))
  );
}

// Shared by request-accept and request-reject.
async function requestThenRespond(decision) {
  const note = `verify ${decision} ${Date.now().toString(36)}`;
  const { tx, before } =
    (await step("requester creates request", (check) => requesterCreatesRequest(check, note))) ??
    {};
  await step("requester sees no accept/reject", (check) => requesterSeesNoButtons(check, tx));
  await step("payee opens request from Mine feed", (check) => payeeOpensRequest(check, tx));
  await step(`payee clicks ${decision === "accept" ? "Accept" : "Reject"} Request`, (check) =>
    payeeResponds(check, { decision, tx, before })
  );
  await step("payee balance in sidenav after reload", balanceAfterReload);
}

module.exports = {
  "request-accept": () => requestThenRespond("accept"),
  "request-reject": () => requestThenRespond("reject"),
};
