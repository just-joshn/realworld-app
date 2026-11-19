# Real World App

This repository is Joshua's test automation portfolio built on a fork of the [Cypress Real World App](https://github.com/cypress-io/cypress-realworld-app). It demonstrates Vitest and Playwright testing methods, patterns, and workflows on a full-stack payment application built with React, XState, Express, TypeScript, and lowdb.

This portfolio is a work in progress. Cypress was removed in PR #1, and PRs #3 to #14 added strict TypeScript, Bun, Oxlint, Vitest unit and browser suites, and Playwright E2E and API suites with page objects. In [`.github/workflows/main.yml`](./.github/workflows/main.yml), CI runs `bun run types`, `bun run lint`, `bun run test:unit`, `bun fmt --check`, `node scripts/check-playwright-practices.mjs`, `bun run build:ci`, and Playwright on pull requests and `develop`. A separate `vitest` job runs `bun run test:component` and `bun run test:integration` on every push and pull request.

## Test layers

The test suite is split across five layers in this checkout.

| Layer                     | Location                                  | Count    |
| ------------------------- | ----------------------------------------- | -------- |
| Unit tests                | `{src,backend}/**/*.unit.test.ts`         | 19 files |
| Browser component tests   | `src/**/*.component.test.tsx`             | 25 files |
| Browser integration tests | `test/integration/*.integration.test.tsx` | 8 files  |
| Playwright E2E specs      | `playwright/e2e/**/*.spec.ts`             | 14 files |
| Playwright API specs      | `playwright/api/*.spec.ts`                | 13 files |

The Playwright E2E suite uses 8 page objects in `playwright/pages/` and 4 UI components in `playwright/components/`.

## Run the app locally

Install [Node.js](https://nodejs.org/en/) matching [`.node-version`](./.node-version) (`22.20.0`) and [Bun](https://bun.com/).

Clone the repository, install dependencies, and start the development servers.

```shell
git clone https://github.com/just-joshn/realworld-app.git
cd realworld-app
bun install
bun run dev
```

The React frontend listens on port `3000`, and the Express API listens on port `3001`.

Starting the app with `bun run dev` copies [`data/database-seed.json`](./data/database-seed.json) to [`data/database.json`](./data/database.json). Run `bun run list:dev:users` to list the seeded user IDs and usernames. Every seeded user uses the password `s3cret`.

Local authentication is the default path. Alternative entry points for Auth0, Okta, Amazon Cognito, and Google live in `src/index.auth0.tsx`, `src/index.okta.tsx`, `src/index.cognito.tsx`, and `src/index.google.tsx`. To use one, configure its variables in [`.env`](./.env), replace `src/index.tsx` with that provider file, and run the matching `dev:auth0`, `dev:okta`, `dev:cognito`, or `dev:google` script.

## Run the tests

Install Playwright browsers once before running browser or E2E suites.

```shell
npx playwright install
```

Run each check or test layer with Bun.

```shell
bun run types
bun run lint
bun run test:unit
bun run test:component
bun run test:integration
bun run test:playwright
```

Use `bun run test:e2e` to run only the Playwright E2E projects or `bun run test:api` to run only the Playwright API project.

## Scripts reference

| Script                     | Purpose                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `bun run dev`              | Seed `data/database.json` and start the frontend and API in watch mode |
| `bun run test:unit`        | Run the Vitest unit project                                            |
| `bun run test:component`   | Run the Vitest browser component project                               |
| `bun run test:integration` | Run the Vitest browser integration project                             |
| `bun run test:playwright`  | Run all Playwright projects                                            |
| `bun run test:e2e`         | Run the Playwright `e2e` and `e2e-mobile` projects                     |
| `bun run test:api`         | Run the Playwright `api` project                                       |
| `bun run types`            | Run `tsc --noEmit` for the app and `tsconfig.node.json`                |
| `bun run lint`             | Run Oxlint                                                             |
| `bun run db:seed`          | Regenerate database seed files and copy to `data/database.json`        |
| `bun run list:dev:users`   | Print user IDs and usernames from `data/database.json`                 |

See [`package.json`](./package.json) for all scripts.

## Attribution and license

This repository is forked from [cypress-io/cypress-realworld-app](https://github.com/cypress-io/cypress-realworld-app). It is licensed under the [MIT license](./LICENSE).
