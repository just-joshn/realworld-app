#!/usr/bin/env node
// Drives the running RWA through a real browser, one named journey per run.
// Usage: scripts/drive.sh <journey> [--headed]
// Each step saves a screenshot + ARIA snapshot; steps.json records action, URL, and checks.
// Exit 0 only when every check passed. The journeys live in ./drive/*.mjs.
import("./drive/main.mjs")
  .then(({ main }) => main())
  .then((code) => process.exit(code))
  .catch((error) => {
    process.stderr.write(`${String(error && error.stack ? error.stack : error)}\n`);
    process.exit(1);
  });
