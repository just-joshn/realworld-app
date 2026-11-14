# Request money

A user requests money from another user through the same **New** wizard by choosing **Request**. Nothing moves yet. The transaction waits as `pending`, and the other user gets a "requested" notification. The other user opens the request and chooses **Accept Request**, which moves the money, or **Reject Request**, which shouldn't.

## Sub-features

- `request-create`: **Request** stores a transaction with `requestStatus: pending` and `status: pending`, leaves balances unchanged, and notifies the other user with `status: requested`. The confirmation reads "Requested $X for <note>".
- `request-requester-view`: the requester sees the transaction detail with no Accept or Reject buttons.
- `request-accept`: the payee accepts. `requestStatus` becomes `accepted` and `status` becomes `complete`. The payee is debited and the requester credited. The requester gets a `received` notification.
- `request-reject`: the payee rejects. `requestStatus` becomes `rejected`, and no balance changes.
- `request-balance-ui`: after responding, the payee's side-nav balance matches the stored balance.

## How to get to it (user POV)

- Requester: **$ NEW**, pick a user, enter an amount and a note, then click **Request** (`transaction-create-submit-request`).
- Payee: **Home**, then the **Mine** tab, then click the request (`transaction-item-<id>`). This opens `/transaction/<id>`.
- Payee: open `/transaction/<id>` directly. The notifications list also links to the request, but this map doesn't cover that path yet.

## Driving it with drive.sh

Preconditions:

- Baseline preconditions from the README are met.
- `Heath93` (the requester) and `Arvilla_Hegmann` (the payee) can sign in with `s3cret`.

- **Accept.** Run `scripts/drive.sh request-accept`.
  1. `Heath93` requests $7 from Arvilla. The DB shows `amount: 700` with both statuses `pending`, balances are unchanged, and Arvilla has a `requested` notification.
  2. On `/transaction/<id>`, Heath93 does not see `transaction-accept-request-<id>`.
  3. Arvilla signs in, in a fresh context. She opens the request from the Mine tab, sees both buttons, and clicks `transaction-accept-request-<id>`.
  4. The DB shows `accepted` and `complete`. Arvilla is down 700 cents, Heath93 is up 700, and Heath93 has a `received` notification. The buttons disappear.
  5. After a reload, `/checkAuth` reports the stored balance, and `sidenav-user-balance` should show it too.
- **Reject.** Run `scripts/drive.sh request-reject`. Steps 1–3 are the same, then Arvilla clicks `transaction-reject-request-<id>`. The DB shows `requestStatus: rejected`. Both balances should be unchanged.
- **Proof.** Look at `/tmp/verify-rwa/evidence/<RUN_ID>/request-accept/04-payee-clicks-accept-request.png`, `05-payee-balance-in-sidenav-after-reload.png`, and `steps.json` (balances before and after, and server versus side-nav balance).

## Gotchas

- `request-reject` guards a fixed bug: rejecting a request used to move the money. Only `requestStatus: accepted` debits the payee and credits the requester. Both outcomes still set `status: complete`.
- The side nav refreshes the user profile after an accept or reject. That used to happen only after *creating* a transaction, so the balance stayed stale even across reloads because the UI restores the user from `localStorage.authState`. A balance change made by someone else (for example, an incoming payment) still isn't picked up until the next refresh or sign-in.
- The API doesn't check that the person updating is the payee. Only the UI hides the buttons from the requester. Don't treat "the requester sees no buttons" as proof of authorization.
- The Accept and Reject handles include the transaction ID. Read the ID from the DB row the journey just created. Never use a seed ID.
