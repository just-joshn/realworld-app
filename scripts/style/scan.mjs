import { buildContext } from "./context.mjs";
import { consoleLog, hardcodedUrl, swallowedError } from "./rules-hygiene.mjs";
import { arrayMutation, objectMutation } from "./rules-mutation.mjs";
import { fileSize, fnSize, nesting } from "./rules-size.mjs";

export const RULES = [
  fileSize,
  fnSize,
  nesting,
  consoleLog,
  arrayMutation,
  objectMutation,
  hardcodedUrl,
  swallowedError,
];

export function scanSource(pathRel, src) {
  const ctx = buildContext(pathRel, src);
  return RULES.flatMap((rule) => rule(ctx));
}
