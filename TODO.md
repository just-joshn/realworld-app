# Autonomous run: upgrade packages to Latest

Exit condition: `bun run types`, `bun run lint`, `bun run test:unit`, `bun run test:browser`, `bun run test:integration`, and `bun run test:playwright` each pass twice consecutively in this worktree. Then a ready (not draft) PR against develop titled `chore(deps): upgrade packages to latest`.

Permissions: branch, commits, push, PR. Not merge.
Workspace: this worktree only, branch `chore/upgrade-deps-latest`, base `develop` at `f9d5219`.
Decision trail: `decisions.tsv` in this worktree. Parent `decisions.tsv` is not writable from here.

Wake: long installs and test suites run under `tmux_run` and wake this session on exit. No idle heartbeat while a gate is in flight.

## Playbook steps

- [x] State the exit condition as a checkable predicate before the first iteration. Write down the permissions, the workspace, and where the decision trail lives.
- [x] Pick the wake mechanism. Long commands use `tmux_run` with a wake on exit.
- [ ] Each iteration makes the smallest change the evidence justifies, verifies it, and commits if it advanced. Verify each unit before the next.
- [ ] Mid-run discoveries that support the goal are in scope. Address them. Do not park reversible work.
- [ ] Checkpoint every iteration in `decisions.tsv`.
- [ ] Stop when the predicate is met. Do not relax it.

## Task units

- [x] `bun install`. Record `bun outdated` Latest column.
- [x] Prune dead packages (webpack, babel stack, @mui/lab, unused @types, graphql-tools umbrella) and confirm types+unit.
- [x] Wave 1 tooling/safe bumps. Gate: types + unit.
- [ ] Wave 2 backend majors. Gate: types + unit + integration.
- [ ] Wave 3 frontend libs. Gate: types + unit.
- [ ] Wave 4 state/UI platforms (xstate, router as one set, react 19 + MUI 9). Gate: types + unit + browser.
- [ ] Wave 5 TypeScript 7, or newest that compiles, with evidence if pinned.
- [ ] Fix pre-existing WebKit browser failures at the root.
- [ ] Full suite twice consecutively, zero failures.
- [ ] Deslop the diff. Focused commits. Push `-u`. Open ready PR against develop.
- [ ] Audit `decisions.tsv` against the transcript. Cross-model review of the trail.
