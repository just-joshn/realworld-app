/**
 * Minimal JS/TS lexer. Produces a "skeleton" with the same offsets as the
 * source where comments, string contents, template text and regex bodies are
 * blanked, plus the string/template literals it saw.
 */
const REGEX_PRECEDERS = "(,=:[!&|?{};+-*%~^";

export const blank = (text) => text.replace(/[^\n]/g, " ");

const lineEnd = (src, i) => {
  const n = src.indexOf("\n", i);
  return n === -1 ? src.length : n;
};

function readQuoted(src, i) {
  const quote = src[i];
  let j = i + 1;
  while (j < src.length && src[j] !== quote && src[j] !== "\n") {
    j += src[j] === "\\" ? 2 : 1;
  }
  return src[j] === quote ? j + 1 : j;
}

function readRegex(src, i) {
  let j = i + 1;
  let inClass = false;
  while (j < src.length && src[j] !== "\n") {
    const c = src[j];
    if (c === "\\") {
      j += 2;
    } else if (c === "/" && !inClass) {
      return j + 1 + (src.slice(j + 1).match(/^[a-z]*/)?.[0].length ?? 0);
    } else {
      inClass = c === "[" ? true : c === "]" ? false : inClass;
      j += 1;
    }
  }
  return -1;
}

function readTemplateChunk(src, from) {
  let j = from;
  while (j < src.length) {
    if (src[j] === "\\") {
      j += 2;
    } else if (src[j] === "`") {
      return { end: j + 1, text: src.slice(from, j), closed: true };
    } else if (src[j] === "$" && src[j + 1] === "{") {
      return { end: j + 2, text: src.slice(from, j), closed: false };
    } else {
      j += 1;
    }
  }
  return { end: src.length, text: src.slice(from), closed: true };
}

function templateToken(src, from, lead, stack) {
  const chunk = readTemplateChunk(src, from);
  const base = lead === "}" ? stack.slice(0, -1) : stack;
  return {
    end: chunk.end,
    out: lead + blank(chunk.text) + (chunk.closed ? "`" : "${"),
    literal: { text: chunk.text, index: from },
    stack: chunk.closed ? base : [...base, 0],
    prev: chunk.closed ? "`" : "{",
  };
}

function quotedToken(src, i, stack) {
  const end = readQuoted(src, i);
  const closed = end > i + 1 && src[end - 1] === src[i];
  const inner = src.slice(i + 1, closed ? end - 1 : end);
  return {
    end,
    out: src[i] + blank(inner) + (closed ? src[i] : ""),
    literal: { text: inner, index: i + 1 },
    stack,
    prev: src[i],
  };
}

function charToken(src, i, stack, prev) {
  const ch = src[i];
  const top = stack[stack.length - 1];
  const inExpr = stack.length > 0;
  if (inExpr && ch === "}" && top === 0) return templateToken(src, i + 1, "}", stack);
  const next =
    inExpr && ch === "{"
      ? [...stack.slice(0, -1), top + 1]
      : inExpr && ch === "}"
        ? [...stack.slice(0, -1), top - 1]
        : stack;
  return { end: i + 1, out: ch, stack: next, prev: /\s/.test(ch) ? prev : ch };
}

function nextToken(src, i, stack, prev) {
  const ch = src[i];
  const two = src.slice(i, i + 2);
  if (two === "//") {
    const end = lineEnd(src, i);
    return { end, out: blank(src.slice(i, end)), stack, prev };
  }
  if (two === "/*") {
    const close = src.indexOf("*/", i + 2);
    const end = close === -1 ? src.length : close + 2;
    return { end, out: blank(src.slice(i, end)), stack, prev };
  }
  if (ch === "'" || ch === '"') return quotedToken(src, i, stack);
  if (ch === "`") return templateToken(src, i + 1, "`", stack);
  if (ch === "/" && (prev === "" || REGEX_PRECEDERS.includes(prev))) {
    const end = readRegex(src, i);
    if (end !== -1) return { end, out: "/" + blank(src.slice(i + 1, end)), stack, prev: "a" };
  }
  return charToken(src, i, stack, prev);
}

export function lex(src) {
  let i = 0;
  let out = "";
  let literals = [];
  let stack = [];
  let prev = "";
  while (i < src.length) {
    const t = nextToken(src, i, stack, prev);
    out += t.out;
    literals = t.literal ? [...literals, t.literal] : literals;
    stack = t.stack;
    prev = t.prev;
    i = t.end;
  }
  return { skeleton: out, literals };
}
