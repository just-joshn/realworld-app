# Sign up and onboarding

A visitor creates an account with first name, last name, username and password. They are sent to sign in. On their first sign-in, a three-step dialog walks them through creating a bank account. The dialog does not come back once the account exists.

## Sub-features

- `signup-form`: the four required fields, plus a confirm-password field that must match.
- `signup-submit`: creates a user row with a bcrypt-hashed password and redirects to `/signin` without signing in.
- `signup-link`: the "Don't have an account? Sign Up" link on `/signin`.
- `onboarding-welcome`: step 1, titled "Get Started with Real World App", appears for any signed-in user with no bank accounts.
- `onboarding-bank-account`: step 2, titled "Create Bank Account". It requires a bank name of at least 5 characters, a 9-digit routing number, and a 9 to 12 digit account number. It writes a `bankaccounts` row.
- `onboarding-finish`: step 3, titled "Finished". Clicking **Done** closes the dialog, and it stays closed after a reload.

## How to get to it (user POV)

- On `/signin`, click **Don't have an account? Sign Up** (`data-test="signup"`).
- Open `http://localhost:3000/signup` directly.
- Onboarding opens automatically after signing in as a user with no bank accounts. No seed user qualifies, so you need a fresh signup.

## Driving it with drive.sh

Preconditions:

- Baseline preconditions from the README are met.
- None needed beyond that. The journey makes up a unique username, `verify_<base36 time>`.

- **Open signup.** Run `scripts/drive.sh signup-onboarding`. It opens `/signup` by URL, and `signup-title` renders.
- **Mismatch validation.** The journey fills all fields and sets `signup-confirmPassword` to a different value. "Password does not match" is shown and `signup-submit` is disabled.
- **Create account.** The journey fixes the confirmation and submits. The URL becomes `/signin`. `data/database.json` gains a user row with a `$2a$` bcrypt password, and `/checkAuth` returns 401.
- **Onboarding.** The journey signs in as the new user. `user-onboarding-dialog-title` reads "Get Started with Real World App". The journey then clicks `user-onboarding-next` and fills `bankaccount-bankName-input`, `bankaccount-routingNumber-input` and `bankaccount-accountNumber-input`. Clicking `bankaccount-submit` changes the title to "Finished", and a `bankaccounts` row with `bankName: "Verify Bank"` exists for the new user ID.
- **Finish and persist.** Clicking Done closes the dialog and `sidenav-username` shows the new username. After a reload, the dialog does not appear.
- **Link entry point.** Run `scripts/drive.sh signup-link`. It checks that a single click on the Sign Up link reaches `/signup`.
- **Proof.** Look at `/tmp/verify-rwa/evidence/<RUN_ID>/signup-onboarding/03-submit-valid-signup.png` and `05-onboarding-step-2-bank-account.png` (the "Finished" dialog), plus `steps.json`, which includes the DB checks.

## Gotchas

- `signup-link` guards a fixed bug. The username field's validation message used to push the Sign Up link down by about 20px between mousedown and mouseup, which swallowed the first click. The sign-in fields now reserve their helper line. If `signup-link` fails again, look for a layout shift on blur before suspecting the harness.
- A signup row stays in `data/database.json` until `cleanup.sh` restores the pre-launch copy.
- The onboarding dialog opens after the bank-account list loads. Wait for `user-onboarding-dialog`, not for a fixed delay.
- The dialog fades in. A screenshot taken without settling shows a half-transparent dialog. The harness waits 400ms and disables animations before each shot.
