# Yup validation boundary audit (PR5)

Goal: keep Yup (no Zod), document where validation lives, fix only clear gaps.

## Layers (as designed)

| Layer | Location | Role |
|-------|----------|------|
| Domain / API response shapes | `src/models/schemas.ts` | Shared Yup models for entities and auth responses |
| DB seed / replace parse | `backend/database-schema.ts` | Yup parse of persisted JSON at store boundary |
| Request body shapes | `backend/request-data.ts` | Yup objects used after express-validator |
| HTTP field checks | `backend/validators.ts` + `validateMiddleware` | express-validator chains on routes |
| Form UX | Formik `validationSchema` in components | Client-side only |
| Playwright API asserts | `playwright/helpers/schemas.ts` | Test contracts, not product path |

Zod imports in first-party code: **none**.

## Product forms

| Surface | Yup? | Notes |
|---------|------|-------|
| SignInForm | yes | username/password |
| SignUpForm | yes | + confirm password |
| UserSettingsForm | yes | profile fields + privacy |
| BankAccountForm | yes | bank/account/routing |
| CommentForm | yes | content |
| TransactionCreateStepTwo | yes | amount/description/etc |
| UserListSearchForm | **no** | free-text search; server has `searchValidation` (`q` exists). Gap is low risk; empty `q` is a product choice, not missing schema debt |

## Backend routes

Mutating / filtered routes generally use `validateMiddleware` + validators. Spot checks:

- users, transactions, bankaccounts, comments, likes, contacts, notifications, testdata entity GET: validated
- `GET /banktransfers`: auth only (no query body) — OK
- `POST /testData/seed`: no body — OK

`request-data.ts` Yup shapes sit next to express-validator; they are the typed parse helpers, not a second HTTP gate. Do not merge into Zod.

## Gaps worth fixing later (none blocking style:check)

1. **Optional:** add a minimal Yup/Formik schema on `UserListSearchForm` only if product wants client length/charset limits; server already requires `q`.
2. **Duplication note (not a fail):** Playwright schemas mirror product shapes loosely — keep separate (test contract vs domain).
3. **No missing Zod migration.** Style rule is Yup at boundaries; already met.

## Decision

PR5 deliverable is this audit. **No code gap fix required** for `style:check` to stay green. Any UserListSearchForm schema is a product enhancement, not style compliance.
