import { MAX_NESTING } from "./config.mjs";

const CLOSER = { "(": ")", "[": "]", "{": "}" };
const OPENER = { ")": "(", "]": "[", "}": "{" };
const CONTROL = new Set(["if", "for", "while", "switch", "catch", "with"]);

export function findClose(s, open) {
  const o = s[open];
  const c = CLOSER[o];
  let depth = 0;
  for (let k = open; k < s.length; k += 1) {
    if (s[k] === o) depth += 1;
    else if (s[k] === c) depth -= 1;
    if (depth === 0) return k;
  }
  return -1;
}

export function findOpen(s, close) {
  const c = s[close];
  const o = OPENER[c];
  let depth = 0;
  for (let k = close; k >= 0; k -= 1) {
    if (s[k] === c) depth += 1;
    else if (s[k] === o) depth -= 1;
    if (depth === 0) return k;
  }
  return -1;
}

function trimmedEnd(s, idx) {
  let e = idx;
  while (e > 0 && /\s/.test(s[e - 1])) e -= 1;
  return e;
}

function closingParenBefore(s, e) {
  if (s[e - 1] === ")") return e - 1;
  const from = Math.max(0, e - 200);
  const m = s.slice(from, e).match(/\)\s*:\s*[^(){};=]*$/);
  return m ? from + m.index : -1;
}

/** Classify a `{` as function / constructor / block / other (object, class, type). */
export function classifyBrace(s, idx) {
  const e = trimmedEnd(s, idx);
  if (s.slice(e - 2, e) === "=>") return { kind: "function", headIdx: e - 2 };
  if (/\b(else|try|finally|do)$/.test(s.slice(Math.max(0, e - 8), e))) {
    return { kind: "block", headIdx: idx };
  }
  const close = closingParenBefore(s, e);
  if (close === -1) return { kind: "other", headIdx: idx };
  const open = findOpen(s, close);
  const head = s.slice(0, open).trimEnd();
  const word = head.match(/([\w$]+)$/)?.[1];
  if (word && CONTROL.has(word)) return { kind: "block", headIdx: open };
  if (word === "constructor") return { kind: "constructor", headIdx: open };
  if (word || /[>\]]$/.test(head)) return { kind: "function", headIdx: open };
  return { kind: "other", headIdx: idx };
}

function openBrace(state, s, idx) {
  const cls = classifyBrace(s, idx);
  const stack = [...state.stack, { ...cls, idx }];
  const depth = stack.filter((f) => f.kind !== "other").length;
  const tooDeep = cls.kind !== "other" && depth === MAX_NESTING + 1;
  return { ...state, stack, deep: tooDeep ? [...state.deep, idx] : state.deep };
}

function closeBrace(state, idx) {
  const top = state.stack[state.stack.length - 1];
  if (!top) return state;
  const isFn = top.kind === "function" || top.kind === "constructor";
  return {
    ...state,
    stack: state.stack.slice(0, -1),
    fns: isFn ? [...state.fns, { headIdx: top.headIdx, closeIdx: idx }] : state.fns,
    ctors:
      top.kind === "constructor" ? [...state.ctors, { open: top.idx, close: idx }] : state.ctors,
  };
}

function expressionArrows(s) {
  return [...s.matchAll(/=>\s*\(/g)].map((m) => ({
    headIdx: m.index,
    closeIdx: findClose(s, m.index + m[0].length - 1),
  }));
}

/** Functions (with spans), constructor spans, and block openings past MAX_NESTING. */
export function analyze(s) {
  const braces = [...s.matchAll(/[{}]/g)].map((m) => m.index);
  const walked = braces.reduce(
    (state, idx) => (s[idx] === "{" ? openBrace(state, s, idx) : closeBrace(state, idx)),
    { stack: [], fns: [], deep: [], ctors: [] }
  );
  return {
    fns: [...walked.fns, ...expressionArrows(s)].filter((f) => f.closeIdx !== -1),
    deep: walked.deep,
    ctors: walked.ctors,
  };
}
