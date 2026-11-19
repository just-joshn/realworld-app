import { execFileSync } from "node:child_process";
import { extname } from "node:path";
import { SOURCE_EXT } from "./config.mjs";

/** Repo-relative paths of every tracked source file. Untracked and ignored files are not the project. */
export function collectFiles(root) {
  const listed = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" });
  return listed
    .split("\0")
    .filter((rel) => rel && SOURCE_EXT.includes(extname(rel)))
    .toSorted();
}
