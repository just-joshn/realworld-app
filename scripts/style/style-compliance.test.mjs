import { describe, expect, test } from "bun:test";
import { FAIL, PASS } from "./fixtures.mjs";
import { RULE_IDS } from "./config.mjs";
import { scanSource } from "./scan.mjs";

const rulesHit = (path, src) => scanSource(path, src).map((v) => v.rule);

describe("passing fixtures", () => {
  test.each(PASS)("%s passes (%s)", (rule, path, src) => {
    expect(rulesHit(path, src)).not.toContain(rule);
  });
});

describe("failing fixtures", () => {
  test.each(FAIL)("%s fails (%s)", (rule, path, src) => {
    expect(rulesHit(path, src)).toContain(rule);
  });
});

test("every rule has one passing and one failing fixture", () => {
  const covered = (set) => new Set(set.map(([rule]) => rule));
  expect(RULE_IDS.filter((r) => !covered(PASS).has(r))).toEqual([]);
  expect(RULE_IDS.filter((r) => !covered(FAIL).has(r))).toEqual([]);
});

test("constructor this.x is the only allowed this assignment", () => {
  const src = FAIL[7][2];
  const lines = scanSource("src/a.ts", src)
    .filter((v) => v.rule === "no-object-mutation")
    .map((v) => v.line);
  expect(lines).toEqual([6]);
});

test("catch callbacks: each of three forms is reported", () => {
  const hits = scanSource("src/a.ts", FAIL[13][2]).filter((v) => v.rule === "no-swallowed-error");
  expect(hits).toHaveLength(3);
});
