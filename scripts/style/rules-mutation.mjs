import { matchRule, snippet } from "./context.mjs";

const ARRAY_MUTATOR = /\.(push|pop|splice|sort|reverse|unshift|shift)\s*\(/g;
const NAVIGATION_RECEIVER = /(?:^|[^\w$])(history|router)$/;

const STATEMENT_START = String.raw`(?:^|[;{}):]|\belse\b|=>)`;
const MEMBER_PATH = String.raw`[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]+\])+`;
/** `const x: Ns.T[] =` and `readonly y: Ns.T =` put a type, not a target, after the colon. */
const ANNOTATED_DECLARATION =
  /\b(?:const|let|var|readonly|private|public|protected|static|declare)\s+[\w$]+[?!]?\s*$/;
const ASSIGN_OP = String.raw`(?:\*\*|\?\?|\|\||&&|>>>|<<|>>|[-+*/%&|^])?=(?![=>])`;
const MEMBER_ASSIGN = new RegExp(`${STATEMENT_START}\\s*(${MEMBER_PATH})\\s*${ASSIGN_OP}`, "gm");
const MEMBER_STEP = new RegExp(`(${MEMBER_PATH})\\s*(?:\\+\\+|--)`, "g");
const OBJECT_ASSIGN = /\bObject\.assign\s*\(\s*(?!\{|\.\.\.)/g;
const DELETE_MEMBER = /\bdelete\s+[\w$]+[.[]/g;

function isNavigationPush(m, ctx) {
  const receiver = ctx.skeleton.slice(Math.max(0, m.index - 30), m.index);
  return m[1] === "push" && NAVIGATION_RECEIVER.test(receiver);
}

export function arrayMutation(ctx) {
  return matchRule(
    ctx,
    "no-array-mutation",
    ARRAY_MUTATOR,
    (m) => `.${m[1]}() mutates in place; ${snippet(ctx, m.index)}`,
    (m) => !isNavigationPush(m, ctx)
  );
}

const pathIndex = (m) => (m[1] ? m.index + m[0].indexOf(m[1]) : m.index);

function insideConstructor(m, ctx) {
  const at = pathIndex(m);
  return ctx.structure.ctors.some((c) => at > c.open && at < c.close);
}

function isTypeAnnotation(m, ctx) {
  if (!m[0].trimStart().startsWith(":")) return false;
  const before = ctx.skeleton.slice(Math.max(0, m.index - 80), m.index + m[0].indexOf(":"));
  return ANNOTATED_DECLARATION.test(before);
}

function isConstructorInit(m, ctx) {
  return /^this[.[]/.test(m[1]) && insideConstructor(m, ctx);
}

export function objectMutation(ctx) {
  const describe = (m) => snippet(ctx, pathIndex(m));
  return [
    ...matchRule(
      ctx,
      "no-object-mutation",
      MEMBER_ASSIGN,
      describe,
      (m) => !isConstructorInit(m, ctx) && !isTypeAnnotation(m, ctx),
      pathIndex
    ),
    ...matchRule(ctx, "no-object-mutation", MEMBER_STEP, describe),
    ...matchRule(ctx, "no-object-mutation", OBJECT_ASSIGN, describe),
    ...matchRule(ctx, "no-object-mutation", DELETE_MEMBER, describe),
  ];
}
