# Bank accounts

A signed-in user sees their linked bank accounts at `/bankaccounts`, adds a new one, and deletes one. Deleting is a soft delete: the account stays in the list marked "(Deleted)" and loses its Delete button. This page is backed by GraphQL (`listBankAccount`, `createBankAccount`, `deleteBankAccount`) instead of REST.

## Sub-features

- `bankaccounts-list`: shows every account stored for the user, including deleted ones.
- `bankaccounts-validation`: the bank name needs at least 5 characters, the routing number exactly 9 digits, and the account number 9 to 12 digits. **Save** is disabled while anything is invalid.
- `bankaccounts-create`: saving writes a `bankaccounts` row for the user and returns to the list with the new item.
- `bankaccounts-delete`: **Delete** sets `isDeleted: true`. The item shows "<name> (Deleted)" and has no Delete button.
- Onboarding creates the first account through the same form. See [Sign up and onboarding](./sign-up-and-onboarding.md).

## How to get to it (user POV)

- Click **Bank Accounts** in the left side nav (`sidenav-bankaccounts`).
- Open `http://localhost:3000/bankaccounts` directly while signed in.
- Click **Create** (`bankaccount-new`) on the list. This goes to `/bankaccounts/new`.

## Driving it with drive.sh

Preconditions:

- Baseline preconditions from the README are met.
- `Heath93` can sign in. The seed gives Heath93 one account.

- **List.** Run `scripts/drive.sh bank-accounts`. `Heath93` clicks `sidenav-bankaccounts` and lands on `/bankaccounts`. The number of `bankaccount-list-item-*` entries equals the number of stored rows for that user.
- **Validation.** The journey clicks `bankaccount-new` and types `abc` into `bankaccount-bankName-input` and `123` into `bankaccount-routingNumber-input`. "Must contain at least 5 characters" and "Must contain a valid routing number" are shown, and `bankaccount-submit` is disabled.
- **Create.** The journey enters a unique name, routing number `987654321` and account number `1234567890`, then saves. The URL returns to `/bankaccounts`. A row with that name exists for Heath93's ID, and `bankaccount-list-item-<id>` shows the name.
- **Delete.** The journey clicks `bankaccount-delete` inside that item. The DB row has `isDeleted: true`. The item reads "<name> (Deleted)" and has no `bankaccount-delete`.
- **Proof.** Look at `/tmp/verify-rwa/evidence/<RUN_ID>/bank-accounts/03-create-account.png`, `04-delete-account.png`, and `steps.json`.

## Gotchas

- Deleted accounts stay in the list. Count rows including `isDeleted`, and don't expect the item to disappear.
- There are several Delete buttons on the page, one per account. Scope the click to `bankaccount-list-item-<id>`.
