# Size-warn split notes (PR3 / PR4)

Deferred until PR2 worker finishes. Both are independent of database.ts.

## scripts/seedDataUtils.ts — DONE (PR3)

Facade at 62 lines. Modules under `scripts/seed/` (config 54, users 94, transactions 232, social 182, bankTransfers 65, buildDatabase 45). `buildDatabase()` still returns env-sized counts. `generateSeedData.ts` keeps importing `./seedDataUtils`.

## playwright/api/transactions.spec.ts — DONE (PR4)

Monolith deleted. Six route-scoped specs (all ≤130 lines). Discovery via `testMatch: **/*.spec.ts`. `--list` shows 21 tests in 6 files.
