---
name: verify-rwa
description: Launch and drive the Cypress Real World App (React web UI on :3000, Express API on :3001) in a real Chromium browser to prove user-facing behavior with screenshots, ARIA snapshots, and database checks. Use when verifying a change to sign-in, sign-up, onboarding, sign-out, user settings, payments, money requests, balances, bank accounts, or any other RWA feature in features/.
---

# Verify the Real World App

RWA is a Venmo-style payments demo. Users interact with the **web UI** at `http://localhost:3000`. The UI calls a REST API at `http://localhost:3001`, plus GraphQL for bank accounts. All data lives in one lowdb JSON file, `data/database.json`, which is tracked in git. The UI is the primary surface. Drive it with the bundled Playwright harness. The API and the DB file are for side-effect checks only.

All helpers live in `.pi/skills/verify-rwa/scripts/` and run from the repo root. In this file, `S` is shorthand for that directory (`S=.pi/skills/verify-rwa/scripts`).

## Isolation: one instance only

The ports are hard-coded: the frontend is on 3000 (`vite.config.ts`), and `.env` sets `PORT` and `VITE_BACKEND_PORT`. The DB path is also fixed (`backend/database.ts`). **You cannot run two instances side by side.** `launch.sh` refuses to start if either port is taken. If that happens, the port belongs to someone else's dev server. Do not kill it. Ask the user, or stop.

This checkout can also be shared with other agents. Another dev server writes the same `data/database.json`, and a `git checkout` makes vite hot-reload every module in the running app, which breaks it partway through a journey. Guards are in place for this:
- `drive.sh` exits **3 (INVALID)** if HEAD differs from the launch HEAD, or changes during a journey. Discard that result, then run cleanup and launch again.
- `cleanup.sh` does not restore the DB if HEAD moved. It saves the pre-launch copy under the evidence root instead.

If other work is happening in the checkout, wait for a quiet window.

## Setup (once per machine)

```bash
$S/setup-tools.sh
```

This script is idempotent. It installs Playwright with Chromium into `~/.cache/verify-rwa/`, outside the repo. The repo's scripts run through [Bun](https://bun.com/docs/installation), which must already be installed.

## Launch

```bash
$S/launch.sh
```

The script does the following:
1. Backs up `data/database.json` to `/tmp/verify-rwa/state/`.
2. Runs `bun run start`. Its `prestart` step reseeds the DB from `data/database-seed.json`. The run uses `NODE_ENV=development` and no file watcher.
3. Puts the server in its own process group and writes the group ID to `/tmp/verify-rwa/state/app.pid`.

It exits 0 only when the instance is **usable**: `/signin` is served and the seed user `Heath93` / `s3cret` can `POST /login`. That normally takes about 6 seconds. The server log is at `/tmp/verify-rwa/state/app.log`.

The seed has 5 users, and every password is `s3cret`. Each user already has one bank account, so seed users never see onboarding. To list them, run `node -e 'for (const u of require("./data/database.json").users) console.log(u.username, u.firstName)'`.

## Doctor

```bash
$S/doctor.sh
```

This is read-only. Run it first, and again whenever something looks off. It checks that:
- The launched process group is alive.
- Ports 3000 and 3001 are owned by **that** group.
- `git HEAD` hasn't moved since launch.
- `/signin` returns 200 and anonymous `/checkAuth` returns 401.
- The seed user can log in.

It prints `HEALTHY` or `UNHEALTHY` and exits non-zero when unhealthy. If HEAD moved, run cleanup and then launch again. Without a watcher, the API serves the code it started with.

## Drive

```bash
RUN_ID=my-change $S/drive.sh <journey> [--headed]
$S/drive.sh            # lists journeys
```

Each journey is a scripted user path in `scripts/drive.cjs`. It runs in a fresh browser context with a 1280×900 viewport, where the desktop nav drawer is open by default. It fills the real forms and clicks the real buttons. It then checks three things: what's visible, the server session (`/checkAuth` fetched from inside the page, so it uses the browser's cookie), and the stored rows in `data/database.json`. It prints `ok` or `FAIL` for each check. Exit codes:
- 0: every check passed.
- 1: a check failed.
- 2: unknown journey.
- 3: INVALID, because the code changed under the running app.

Current journeys are listed in `features/README.md`. Journeys that involve two people use `signInAs(username)`. It opens a fresh browser context, so each person has their own cookies and `localStorage`, like two different machines. Money checks read balances from `data/database.json` in cents and compare them to the side nav's `$X,XXX.XX`. Selectors are the app's `data-test` attributes. MUI `TextField`s put `data-test` on the wrapper, so the harness targets `[data-test=X] input`. The settings form is the exception: its `data-test` is on the input itself.

To add a journey, add a function to the `journeys` object in `drive.cjs` and follow the existing pattern:
- `step(label, fn)` for each user action.
- `check(desc, ok, actual)` for each observable.
- `db()` for side effects.

Then add the journey to the matching feature file.

## Evidence

Evidence is written to `/tmp/verify-rwa/evidence/<RUN_ID>/<journey>/`:
- `NN-<step>.png`: a full-page screenshot taken after each step, once animations settle.
- `NN-<step>.aria.yml`: the ARIA snapshot of the page after that step.
- `steps.json`: each step's label, URL, and checks with actual values, plus browser console errors.

Proof standards:
- **Drive the real user path.** Never use `/testData/*`, and never call API mutations directly to set up the thing you're proving. Seeding comes only from `launch.sh`.
- **Capture the action and the resulting state.** The per-step shots do this. Don't hand over just the final screen.
- **Check side effects as well as the UI.** For example, verify a DB row was written, a password was hashed, or a session was created or destroyed. A green banner alone is not proof.
- **No mocks.** Nothing here talks to an external system in the default local-auth mode. Auth0, Okta, Cognito, and Google modes (`bun run dev:auth0` etc.) need real tenant credentials in `.env`. They are **not** covered by this skill.
- **Journeys mutate the shared DB.** For example, `settings` renames `Heath93`, and every money journey changes balances. Write checks against the stored value, not hard-coded seed values. To get a clean state, run cleanup and launch again.

## Cleanup

```bash
$S/cleanup.sh
```

The script does the following:
1. Kills **only** the process group recorded in `app.pid`, never by name.
2. Restores `data/database.json` from the pre-launch backup, so signups and edits made during the run don't leave a dirty tracked file.
3. Deletes `/tmp/verify-rwa/state/`.

It never touches `/tmp/verify-rwa/evidence/`. Run it after every run, including failed ones. Afterwards, `lsof -nP -iTCP:3000 -iTCP:3001 -sTCP:LISTEN` should print nothing, and `git status` should show no change to `data/`.

## Feature map

`features/README.md` indexes each feature, with one recipe file per feature. When a feature has several entry points, prove each one the map lists. If a journey fails because of the app, report the failure. Never weaken the journey.
