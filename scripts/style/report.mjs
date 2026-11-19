import { RULE_IDS } from "./config.mjs";

const countBy = (items, keyOf) =>
  items.reduce((acc, item) => ({ ...acc, [keyOf(item)]: (acc[keyOf(item)] ?? 0) + 1 }), {});

const topDir = (v) => (v.path.includes("/") ? v.path.split("/")[0] : "(root)");

export function summarize(filesScanned, violations) {
  return {
    filesScanned,
    violationCount: violations.length,
    byRule: {
      ...Object.fromEntries(RULE_IDS.map((r) => [r, 0])),
      ...countBy(violations, (v) => v.rule),
    },
    byDir: countBy(violations, topDir),
    violations,
  };
}

export function formatText(summary) {
  const head = [
    `files=${summary.filesScanned} violations=${summary.violationCount}`,
    `byRule ${JSON.stringify(summary.byRule)}`,
    `byDir ${JSON.stringify(summary.byDir)}`,
  ];
  const fails = summary.violations.map((v) => `[FAIL] ${v.rule} ${v.path}:${v.line} ${v.detail}`);
  const tail = summary.violationCount === 0 ? ["PASS"] : [];
  return [...head, ...fails, ...tail].join("\n") + "\n";
}
