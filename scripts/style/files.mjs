import { readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { SCANNED_ROOT_DIRS, SKIP_ANYWHERE, SKIP_AT_ROOT, SOURCE_EXT } from "./config.mjs";

const toRel = (root, full) => relative(root, full).split("\\").join("/");

function isSkipped(root, dir, name) {
  if (SKIP_ANYWHERE.includes(name)) return true;
  return dir === root && SKIP_AT_ROOT.includes(name);
}

function walk(root, dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !isSkipped(root, dir, entry.name))
    .flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(root, full);
      return SOURCE_EXT.includes(extname(entry.name)) ? [full] : [];
    });
}

function inScope(rel) {
  const [top] = rel.split("/");
  return !rel.includes("/") || SCANNED_ROOT_DIRS.includes(top);
}

/** Repo-relative paths of every first-party source file. */
export function collectFiles(root) {
  return walk(root, root)
    .map((full) => toRel(root, full))
    .filter(inScope)
    .toSorted();
}
