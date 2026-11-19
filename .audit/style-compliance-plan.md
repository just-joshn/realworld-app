# Style compliance plan

## What changes

First-party product code meets the coding style rules with zero measured violations from `bun run style:check`. Behavior stays pinned.

## Definition of done (falsifiable)

`bun run style:check` exits 0 on a clean tree, and backend database unit tests stay green after the `database.ts` split.

## Measured baseline (after gate hardening)

Initial naive scan reported 139 hits, mostly false positives (Playwright `this.` init, test doubles, CLI collectors).

Hardened gate scope (product `src/` + `backend/`, exclude tests, allow constructor `this.`, lowdb `db.data`, Express `req.session`, CLI stdout) left **10 real fails**, then first fixes landed in this run.

Remaining expected fail until PR3: `file-size-max` on `backend/database.ts` (~900 lines).

Warn-only today: `scripts/seedDataUtils.ts` (624), `playwright/api/transactions.spec.ts` (451).

Validation: Yup in 25 files, Zod 0. Project rule keeps Yup.

## Project calls settled in framing

1. Keep Yup. Do not migrate to Zod for style compliance.
2. lowdb row `push` and `db.data` writes are persistence-boundary allowlists.
3. Express `req.session` writes are framework-boundary allowlists.
4. Generated `SvgUndraw*` excluded from size fail.
5. Playwright page objects and test harnesses are out of mutation-rule scope (not domain updates).

## Rigor

High for `backend/database.ts` split. Medium for seed/playwright splits. Low for console.log removals already applied.

## PR graph

```
PR1 style gate + AGENTS rules + console.log + immutable DB updates   (in progress)
PR2 split backend/database.ts by domain                              (after PR1; review-gated)
PR3 split scripts/seedDataUtils.ts                                   (independent after PR1)
PR4 split playwright/api/transactions.spec.ts                        (independent after PR1)
PR5 validation-boundary audit checklist                              (independent after PR1)
PR6 promote fn-size/nesting notes to fails + CI wire-up              (after PR2–PR4)
```

## PR1 — Gate + first violations

- Files: `scripts/style-compliance.mjs`, `package.json`, `AGENTS.md`, `backend/helpers.ts`, `backend/database.ts`, `src/containers/AppGoogle.tsx`, `.audit/*`
- Change: encode rules; remove debug logs; immutable user/transaction/notification updates
- Verify: `bun run style:check` only reports `backend/database.ts` size (or passes if split deferred); `bun run test:unit` database-related tests

## PR2 — Split database.ts

- Depends on: PR1
- Change: domain modules under `backend/db/` (or equivalent), migrate callers, delete monolith in one wave
- Verify: all `backend/database*.test.ts` green; style size rule green; no route behavior change
- Review-gated before merge

## PR3 / PR4 — Size warns

Split seed utils and transactions API spec under 400 where practical, under 800 hard.

## PR5 — Validation audit

Document every HTTP/form entry point and confirm Yup validation. Close gaps only.

## PR6 — Tighten

Add `style:check` to CI (done in `.github/workflows/main.yml`).

**Do not promote** the 56 `fn-size-warn` / `nesting-warn` notes to fails yet. Most sit in tests and page objects; flipping them would fail the done predicate immediately. Clear that debt in a later sweep, then promote.

## Unproven until PR2

Exact cut lines in `database.ts` without circular imports. Needs architect before the move.
