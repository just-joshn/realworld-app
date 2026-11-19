## 1. Playwright string literals

Allow string literals by default. Centralize them when they define shared contracts, require coordinated changes, or represent significant business invariants. Prefer TypeScript literal unions for finite value sets and `as const` objects when named runtime values are useful.

Shared contracts live in `playwright/helpers/contracts.ts` (domain value sets and app routes). Keep accessible-name locator strings in page objects and assertion copy in specs. Do not invent a constants dump for one-off UI copy, role names, HTTP verbs, or import paths.

## 2. Coding style (enforced)

Gate: `bun scripts/style-compliance.mjs` (also `bun run style:check`). Exit 0 is required for style work to be done.

- Immutability in `src/` and `backend/` product code. Return new objects and arrays. Do not reassign fields on existing domain values.
- Constructor `this.field =` init is allowed. React Router `history.push` is navigation, not array mutation.
- Persistence and framework boundaries may write through their APIs (`db.data`, `rows(table).push`, Express `req.session`). Keep those writes at the boundary file, not in UI or domain helpers.
- Validate external input at HTTP and form boundaries with **Yup** (already in tree via `src/models/schemas.ts`). Do not add Zod alongside Yup.
- No `console.log` in product code. Use `console.error` in catch paths when logging is required. CLI reporters and server listen banners may write to stdout.
- Files typically 200–400 lines, hard max 800. Generated `SvgUndraw*` components are excluded from the size fail.
- Organize by feature or domain. Prefer many small files over large catch-alls.
- Prefer small functions (<50 lines) and shallow nesting. The compliance script reports these as notes until the debt is cleared, then they become fails.
