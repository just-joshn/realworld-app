## 1. Playwright string literals

Allow string literals by default. Centralize them when they define shared contracts, require coordinated changes, or represent significant business invariants. Prefer TypeScript literal unions for finite value sets and `as const` objects when named runtime values are useful.

Shared contracts live in `playwright/helpers/contracts.ts` (domain value sets and app routes). Keep accessible-name locator strings in page objects and assertion copy in specs. Do not invent a constants dump for one-off UI copy, role names, HTTP verbs, or import paths.

## 2. Coding style (enforced)

Gate: `bun run style:check` (`bun scripts/style-compliance.mjs`). It scans every tracked source file (tests, Playwright, scripts included) with no allowlists, and exit 0 is required. Gate self-tests: `bun test scripts/style`.

- Immutability everywhere. Return new objects and arrays; no member assignment, `push`/`sort`/etc., `delete`, or `Object.assign` onto an existing value. Only `this.x =` inside a class `constructor` and router `history.push` are not mutations.
- Persistence goes through `replaceDatabase` / `replaceTable` in `backend/db/store.ts`, the single place database state is swapped. The one express-session write is `setSessionCookieMaxAge` in `backend/session-cookie.ts`.
- Files at most 400 lines. Functions under 50 lines. Nesting at most 4.
- No `console.log`. CLIs write with `process.stdout.write`; errors use `console.error`. No empty `catch` or no-op `.catch`.
- No URL or host literals outside a module whose basename matches `/config/i`. App and API URLs come from `src/utils/apiConfig.ts`.
- Validate external input at HTTP and form boundaries with **Yup** (`src/models/schemas.ts`, `backend/request-data.ts`). Do not add Zod.
- Organize by feature or domain. Prefer many small files over large catch-alls.
