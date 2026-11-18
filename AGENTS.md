## 1. Playwright string literals

Allow string literals by default. Centralize them when they define shared contracts, require coordinated changes, or represent significant business invariants. Prefer TypeScript literal unions for finite value sets and `as const` objects when named runtime values are useful.

Shared contracts live in `playwright/helpers/contracts.ts` (domain value sets and app routes). Keep accessible-name locator strings in page objects and assertion copy in specs. Do not invent a constants dump for one-off UI copy, role names, HTTP verbs, or import paths.
