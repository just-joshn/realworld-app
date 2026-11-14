# RWA verification map

This directory is the maintained source for verifying user-facing behavior in the Real World App. Read this index before driving the app. Then use the matching feature file as the recipe.

## Baseline preconditions

- `scripts/setup-tools.sh` has run on this machine.
- Nothing else listens on ports 3000 or 3001.
- `scripts/launch.sh` started the instance from a freshly seeded `data/database.json`.
- `scripts/doctor.sh` prints `HEALTHY`.
- The seed user `Heath93` / `s3cret` exists. All seed passwords are `s3cret`.
- Never drive an instance this run did not launch.

## Driving conventions

- Run journeys with `RUN_ID=<id> scripts/drive.sh <journey>` from the repo root. Use one `RUN_ID` per verification so the evidence is grouped.
- Journeys share the one DB, and later journeys see earlier mutations. To get pristine seed data, run `scripts/cleanup.sh` and then `scripts/launch.sh`.
- Use `data-test` handles. Do not use text positions or coordinates.
- Clean up with `scripts/cleanup.sh`. It restores `data/database.json` and keeps the evidence.

## Proof and skip reporting

- Every step saves a screenshot, an ARIA snapshot, and checks in `steps.json` under `/tmp/verify-rwa/evidence/<RUN_ID>/<journey>/`.
- A mutation is proven only when both the UI and the stored row in `data/database.json` show it.
- Session claims are proven with `/checkAuth` status from the browser context.
- Report a failing check with its `actual` value. Do not report an entry point as verified when you reached the feature through a different one.

## Feature entry contract

Each feature file starts with an H1 and a one-paragraph description of the behavior. It then has four H2 sections, in this order:

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with drive.sh`
4. `Gotchas`

## Features

| Feature                                               | Journeys                                                      | Status on branch `work` |
| ----------------------------------------------------- | ------------------------------------------------------------- | ----------------------- |
| [Sign in and session](./sign-in-and-session.md)       | `signin`, `signin-invalid`, `remember-me`, `signout`, `guard` | all pass                |
| [Sign up and onboarding](./sign-up-and-onboarding.md) | `signup-onboarding`, `signup-link`                            | all pass                |
| [User settings](./user-settings.md)                   | `settings`                                                    | pass                    |
| [Send a payment](./send-payment.md)                   | `pay`, `pay-insufficient`, `pay-cents`                        | all pass                |
| [Request money](./request-money.md)                   | `request-accept`, `request-reject`                            | all pass                |
| [Bank accounts](./bank-accounts.md)                   | `bank-accounts`                                               | pass                    |

Not yet mapped: the transaction feeds and filters, likes and comments, notifications, and the third-party auth modes (Auth0, Okta, Cognito, Google).
