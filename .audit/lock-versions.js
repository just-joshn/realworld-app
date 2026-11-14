// Usage: node lock-versions.js yarn.lock|bun.lock -> sorted unique name@version
const fs = require("fs");
const f = process.argv[2];
const s = fs.readFileSync(f, "utf8");
const out = new Set();
if (f.endsWith("yarn.lock")) {
  let name = null;
  for (const line of s.split("\n")) {
    if (/^\S/.test(line) && !line.startsWith("#")) {
      const first = line.replace(/^"/, "").split(/,\s*/)[0].replace(/"$/, "");
      name = first.slice(0, first.lastIndexOf("@"));
    }
    const m = line.match(/^  version "(.+)"/);
    if (m && name) out.add(name + "@" + m[1]);
  }
} else {
  const j = Function("return (" + s + ")")();
  for (const v of Object.values(j.packages)) {
    const id = v[0];
    if (typeof id === "string" && !id.includes("@workspace:")) out.add(id);
  }
}
console.log([...out].sort().join("\n"));
