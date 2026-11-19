import { lex } from "./lex.mjs";
import { analyze } from "./structure.mjs";

export function countLines(src) {
  const parts = src.split(/\r?\n/);
  return parts[parts.length - 1] === "" ? parts.length - 1 : parts.length;
}

export const lineAt = (src, index) => src.slice(0, index).split("\n").length;

export function buildContext(pathRel, src) {
  const { skeleton, literals } = lex(src);
  return {
    pathRel,
    src,
    skeleton,
    literals,
    structure: analyze(skeleton),
    lineOf: (index) => lineAt(src, index),
  };
}

export const violation = (rule, ctx, line, detail) => ({
  rule,
  path: ctx.pathRel,
  line,
  detail,
});

/** Violations for every regex match on the skeleton, optionally filtered. */
export function matchRule(ctx, rule, regex, describe, keep = () => true, at = (m) => m.index) {
  return [...ctx.skeleton.matchAll(regex)]
    .filter((m) => keep(m, ctx))
    .map((m) => violation(rule, ctx, ctx.lineOf(at(m)), describe(m, ctx)));
}

export const snippet = (ctx, index) =>
  ctx.src.split("\n")[ctx.lineOf(index) - 1].trim().slice(0, 120);
