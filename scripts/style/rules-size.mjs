import { MAX_FILE_LINES, MAX_FN_LINES, MAX_NESTING } from "./config.mjs";
import { countLines, violation } from "./context.mjs";

export function fileSize(ctx) {
  const n = countLines(ctx.src);
  return n > MAX_FILE_LINES
    ? [violation("file-size", ctx, 1, `${n} lines > ${MAX_FILE_LINES}`)]
    : [];
}

export function fnSize(ctx) {
  return ctx.structure.fns
    .map((f) => ({ start: ctx.lineOf(f.headIdx), end: ctx.lineOf(f.closeIdx) }))
    .map((f) => ({ ...f, span: f.end - f.start + 1 }))
    .filter((f) => f.span > MAX_FN_LINES)
    .map((f) =>
      violation("fn-size", ctx, f.start, `function spans ${f.span} lines > ${MAX_FN_LINES}`)
    );
}

export function nesting(ctx) {
  return ctx.structure.deep.map((idx) =>
    violation("nesting", ctx, ctx.lineOf(idx), `block nested deeper than ${MAX_NESTING}`)
  );
}
