const path = require("path");

const FRONTEND = "http://localhost:3000";
const BACKEND = "http://localhost:3001";
const REPO = path.resolve(__dirname, "../../../../..");
const DB_FILE = path.join(REPO, "data/database.json");
const SEED = { username: "Heath93", password: "s3cret" };
const PAYEE = "Arvilla_Hegmann"; // seed user, password s3cret
const LOW_BALANCE = "Judah_Dietrich50"; // lowest seed balance ($494.74)
const VIEWPORT = { width: 1280, height: 900 };

const journeyName = process.argv[2];
const headed = process.argv.includes("--headed");
const runId = process.env.RUN_ID || new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(
  process.env.EVIDENCE_ROOT || "/tmp/verify-rwa/evidence",
  runId,
  journeyName || "none"
);

module.exports = {
  FRONTEND,
  BACKEND,
  DB_FILE,
  SEED,
  PAYEE,
  LOW_BALANCE,
  VIEWPORT,
  journeyName,
  headed,
  runId,
  outDir,
};
