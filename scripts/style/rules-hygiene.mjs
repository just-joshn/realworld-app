import { basename } from "node:path";
import { matchRule, violation } from "./context.mjs";

const URL_LITERAL = /https?:\/\/|localhost/;
const CONFIG_FILE = /config/i;

export function consoleLog(ctx) {
  return matchRule(ctx, "no-console-log", /\bconsole\.log\b/g, () => "console.log in code");
}

export function hardcodedUrl(ctx) {
  if (CONFIG_FILE.test(basename(ctx.pathRel))) return [];
  return ctx.literals
    .filter((lit) => URL_LITERAL.test(lit.text))
    .map((lit) =>
      violation(
        "no-hardcoded-url",
        ctx,
        ctx.lineOf(lit.index),
        `URL literal: ${lit.text.trim().slice(0, 80)}`
      )
    );
}

const EMPTY_CATCH = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
const VOID_VALUE = String.raw`(?:undefined|null|void\s*0?)`;
const CALLBACK_HEAD = String.raw`(?:async\s*)?(?:function\s*[\w$]*\s*\([^)]*\)|\([^)]*\)|[\w$]+)\s*(?:=>)?\s*`;
const CALLBACK_BODY = String.raw`(?:\{\s*(?:return\s*${VOID_VALUE}?\s*;?\s*)?\}|${VOID_VALUE})`;
const EMPTY_CATCH_CALLBACK = new RegExp(
  String.raw`\.catch\s*\(\s*${CALLBACK_HEAD}${CALLBACK_BODY}\s*[,)]`,
  "g"
);

export function swallowedError(ctx) {
  const describe = () => "error swallowed: empty or void catch handler";
  return [
    ...matchRule(ctx, "no-swallowed-error", EMPTY_CATCH, describe),
    ...matchRule(ctx, "no-swallowed-error", EMPTY_CATCH_CALLBACK, describe),
  ];
}
