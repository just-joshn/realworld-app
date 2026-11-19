# database.ts split — target shape

## Goal

Get `backend/database.ts` under the 800-line hard max (prefer ≤400 per module) with behavior unchanged. Callers keep importing from `./database` or `../backend/database`.

## Two shapes considered

### A — Domain modules under `backend/db/` (chosen)

```
backend/db/
  store.ts           # LowSync instance, emptyDatabase, rows, persist, select,
                     # rowMatches, getBy, getAllBy, getAllByObj, getAllForEntity,
                     # seedDatabase, replaceDatabase; export table name consts
  users.ts           # user CRUD, search helpers, getRandomUser, getFullNameForUser
  contacts.ts
  bankaccounts.ts
  banktransfers.ts
  transactions.ts    # queries, create/update, balance debit/credit, API formatters
  likes.ts
  comments.ts
  notifications.ts
backend/database.ts  # export * from each db module (thin public facade only)
```

Ownership: one table family per file. Cross-entity writes stay in the module that owns the command (e.g. `createLikes` lives in likes.ts and calls into notifications).

Cycles: formatters and create* flows call sibling getters at runtime only (no top-level cross calls). Bun/TS tolerate that when exports are functions. Do not introduce lazy `require` indirection.

### B — Flat route-aligned files at `backend/` root

`database-users.ts`, `database-transactions.ts`, … plus barrel. Rejected: clutters `backend/` next to Express routes; weaker domain boundary; same cycle issues without a clearer home for shared store.

## Non-goals

- No Yup/Zod change
- No public API rename
- No behavior change to balances, notifications, or filters
- No compatibility shim that keeps monolith bodies alive

## Pin

`bun run test:unit -- backend/database.entities.test.ts backend/database.transactions.test.ts backend/database.notifications.test.ts` must stay green (56 tests).

## Done

- Monolith body deleted; `database.ts` is re-exports only
- Every new file ≤400 lines; `bun run style:check` no longer reports file-size-max
- Same 56 tests green
