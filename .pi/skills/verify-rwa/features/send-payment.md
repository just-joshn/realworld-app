# Send a payment

A signed-in user pays another user through the **New** wizard. The money moves as soon as they submit. The payer's balance goes down, the receiver's goes up, the transaction is `complete`, and the receiver gets a "received" notification. If the payer's in-app balance is too low, the backend withdraws the shortfall from their linked bank account and sets their balance to $0.00.

## Sub-features

- `pay-pick-receiver`: step 1 lists every user except you. The search box filters by name, username, email or phone.
- `pay-submit`: step 2 takes an amount and a note. **Pay** creates a `complete` transaction, moves both balances, and notifies the receiver.
- `pay-confirm`: step 3 reads "Paid $X for <note>". It offers **Return To Transactions** and **Create Another Transaction**.
- `pay-balance-refresh`: the payer's side-nav balance updates without a reload.
- `pay-feed`: the payment appears in the payer's **Mine** tab as `-$X`.
- `pay-shortfall`: when amount > balance, a `banktransfers` row is written (`type: withdrawal`, amount = shortfall), the payer's balance becomes 0, and the receiver gets the full amount.
- `pay-cents`: amounts with cents, such as `$12.34`, keep the cents.

## How to get to it (user POV)

- Click **$ NEW** in the top bar (`nav-top-new-transaction`). This goes to `/transaction/new`.
- Open `http://localhost:3000/transaction/new` directly while signed in.
- After a payment, click **Create Another Transaction** (`new-transaction-create-another-transaction`) on the confirmation screen.

## Driving it with drive.sh

Preconditions:

- Baseline preconditions from the README are met.
- Seed users `Heath93`, `Arvilla_Hegmann` and `Judah_Dietrich50` exist, all with password `s3cret`.
- For `pay-insufficient`, `Judah_Dietrich50` has less than $600.00. The seed gives $494.74. Re-running without a relaunch still works, because the balance drops to $0.

- **Pay.** Run `scripts/drive.sh pay`. `Heath93` opens the wizard. The journey checks that Heath93 is not in `users-list`, searches `user-list-search-input` for "Kristian", and clicks `user-list-item-GjWovtg2hr`. It types `12` into `#amount`, fills `transaction-create-description-input`, and clicks `transaction-create-submit-payment`. The confirmation reads "Paid $12.00 for <note>". In the DB, the transaction has `amount: 1200` and `status: complete`. The payer's balance is down 1200 cents and the payee's is up 1200. The payee's notification has `status: received`. `sidenav-user-balance` shows the new payer balance. **Return To Transactions** goes to `/`. The **Mine** tab shows `transaction-amount-<id>` = `-$12.00`. When signed in fresh, the payee's side nav shows the credited balance.
- **Shortfall.** Run `scripts/drive.sh pay-insufficient`. `Judah_Dietrich50` pays `Heath93` $600. The transaction is `complete`. Judah's balance is 0 and Heath93 gets the full 60000 cents. `banktransfers` has a `withdrawal` row for that `transactionId` whose amount equals the shortfall. The side nav shows `$0.00`.
- **Cents.** Run `scripts/drive.sh pay-cents`. The journey pays `12.34` and expects `amount: 1234` and a 1234-cent debit.
- **Proof.** Look at `/tmp/verify-rwa/evidence/<RUN_ID>/pay/03-submit-payment.png` (the confirmation and side-nav balance), `04-...png` (the Mine feed), and `steps.json` (balances before and after).

## Gotchas

- `pay-cents` guards a fixed bug. Cents used to be dropped in three places: the API validator's `toInt()`, the `amount * 100` float math, and the confirmation screen's `parseInt`. `pay` uses whole dollars, and `pay-cents` covers fractional amounts.
- The shortfall withdrawal only exists in the DB. There is no bank-transfer screen. The DB row is the proof.
- The confirmation screen appears before the server finishes. The harness waits for the notification row, which is the last write, before it checks balances.
- `#amount` is a formatted field that adds `$` and thousands separators. Fill it with plain digits like `12` or `600`.
- Seed balances drift across journeys in one launch. Checks compare before and after values, never seed constants.
