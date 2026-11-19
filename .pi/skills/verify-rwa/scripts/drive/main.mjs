import fs from "node:fs";
import path from "node:path";
import { journeyName, headed, runId, outDir } from "./config.mjs";
import * as session from "./session.mjs";
import { hasFailed, getSteps, out } from "./recorder.mjs";
import { journeys as payJourneys } from "./journeys-pay.mjs";
import { journeys as requestJourneys } from "./journeys-request.mjs";
import { journeys as bankJourneys } from "./journeys-bank.mjs";
import { journeys as authJourneys } from "./journeys-auth.mjs";
import { journeys as signupJourneys } from "./journeys-signup.mjs";
import { journeys as settingsJourneys } from "./journeys-settings.mjs";

const journeys = {
  ...payJourneys,
  ...requestJourneys,
  ...bankJourneys,
  ...authJourneys,
  ...signupJourneys,
  ...settingsJourneys,
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

/** Runs the journey named on the command line and returns the process exit code. */
export async function main() {
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
