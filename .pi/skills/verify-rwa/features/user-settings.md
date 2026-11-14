# User settings

A signed-in user edits their first name, last name, email and phone number at `/user/settings`. Saved values update the side nav right away and persist on the server.

## Sub-features

- `settings-prefill`: the form opens with the stored profile values.
- `settings-validation`: an invalid email or phone number, or an empty name field, shows an inline message and disables **Save**.
- `settings-save`: saving writes the changes to the user row and updates `sidenav-user-full-name`.
- `settings-persist`: after a reload, the form shows the saved values.

## How to get to it (user POV)

- Choose **My Account** in the left side nav (`sidenav-user-settings`).
- Open `http://localhost:3000/user/settings` directly while signed in.

## Driving it with drive.sh

Preconditions:

- Baseline preconditions from the README are met.
- `Heath93` / `s3cret` can sign in.

- **Open settings.** Run `scripts/drive.sh settings`. The journey signs in and clicks `sidenav-user-settings`. The URL becomes `/user/settings`. `user-settings-firstName-input` holds the stored `firstName`.
- **Validation.** The journey types `not-an-email` into `user-settings-email-input`. "Must contain a valid email address" is shown and `user-settings-submit` is disabled.
- **Save.** The journey enters a valid email and a new first name, `Ted<4 chars>`, then clicks `user-settings-submit`. `sidenav-user-full-name` shows the new name. The `Heath93` row in `data/database.json` has the new `firstName` and `email`.
- **Persist.** After a reload, the form shows the saved first name.
- **Proof.** Look at `/tmp/verify-rwa/evidence/<RUN_ID>/settings/03-save-new-first-name.png` and `steps.json`, which includes the DB values.

## Gotchas

- These inputs carry `data-test` on the `<input>` itself, through `inputProps`. Target `[data-test=user-settings-*-input]` directly, not `... input`.
- No success toast appears after saving. The proof is the side-nav name plus the DB row.
- This journey permanently renames `Heath93` for the rest of the launch. Other journeys read the name from the DB to cope with this.
- The default privacy level is not on this form, even though the validation schema mentions it.
