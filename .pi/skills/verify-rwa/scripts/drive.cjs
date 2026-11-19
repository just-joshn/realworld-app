#!/usr/bin/env node
// Drives the running RWA through a real browser, one named journey per run.
// Usage: scripts/drive.sh <journey> [--headed]
// Each step saves a screenshot + ARIA snapshot; steps.json records action, URL, and checks.
// Exit 0 only when every check passed.
const fs = require("fs");
const path = require("path");
const { journeyName, headed, runId, outDir } = require("./drive/config.cjs");
const session = require("./drive/session.cjs");
const { hasFailed, getSteps, out } = require("./drive/recorder.cjs");

const journeys = {
  ...require("./drive/journeys-pay.cjs"),
  ...require("./drive/journeys-request.cjs"),
  ...require("./drive/journeys-bank.cjs"),
  ...require("./drive/journeys-auth.cjs"),
  ...require("./drive/journeys-signup.cjs"),
  ...require("./drive/journeys-settings.cjs"),
};

function writeEvidence() {
  const report = {
    journey: journeyName,
    runId,
    passed: !hasFailed(),
    steps: getSteps(),
    consoleErrors: session.getConsoleErrors(),
  };
  fs.writeFileSync(path.join(outDir, "steps.json"), JSON.stringify(report, null, 2));
}

async function main() {
  if (!Object.hasOwn(journeys, journeyName)) {
    process.stderr.write(
      `usage: drive.sh <journey> [--headed]\njourneys: ${Object.keys(journeys).join(", ")}\n`
    );
    return 2;
  }
  fs.mkdirSync(outDir, { recursive: true });
  await session.launch(headed);
  const ctx = await session.newSession();
  try {
    await journeys[journeyName](ctx);
  } finally {
    writeEvidence();
    await session.closeBrowser();
  }
  out(`${hasFailed() ? "FAILED" : "PASSED"} ${journeyName}  evidence: ${outDir}`);
  return hasFailed() ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    process.stderr.write(`${String(error && error.stack ? error.stack : error)}\n`);
    process.exit(1);
  });
