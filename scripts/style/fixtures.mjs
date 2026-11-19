const lines = (...rows) => rows.join("\n") + "\n";
const body = (n) => Array.from({ length: n }, (_, i) => `  const v${i} = ${i};`);
const bigFn = (n) => lines("function big() {", ...body(n), "  return 1;", "}");
const URL_HEAD = "http" + "://";
const HOST = "local" + "host";

/** One passing and one failing fixture per rule: [rule, path, source]. */
export const PASS = [
  [
    "file-size",
    "src/a.ts",
    lines(...Array.from({ length: 400 }, (_, i) => `export const a${i} = ${i};`)),
  ],
  ["fn-size", "src/a.ts", bigFn(46)],
  [
    "nesting",
    "src/a.ts",
    lines(
      "function f(a) {",
      "  if (a) {",
      "    for (const x of a) {",
      "      if (x) {",
      "        return x;",
      "      }",
      "    }",
      "  }",
      "  return 0;",
      "}"
    ),
  ],
  [
    "no-console-log",
    "src/a.ts",
    lines("// console.log(1)", 'export const s = "console.log";', "console.error(1);"),
  ],
  [
    "no-array-mutation",
    "src/a.ts",
    lines("export const b = [...a, 1];", "history.push('/x');", "props.history.push('/y');"),
  ],
  [
    "no-object-mutation",
    "src/a.ts",
    lines(
      "export const c = { ...o, k: 1 };",
      "const d = Object.assign({}, o);",
      "class A {",
      "  constructor(x) {",
      "    this.x = x;",
      "  }",
      "}"
    ),
  ],
  [
    "no-hardcoded-url",
    "src/utils/apiConfig.ts",
    lines(`export const API = "${URL_HEAD}${HOST}:3001";`),
  ],
  [
    "no-hardcoded-url",
    "src/a.ts",
    lines("// see " + URL_HEAD + "x", "export const u = `${base}/users`;"),
  ],
  [
    "no-swallowed-error",
    "src/a.ts",
    lines("try { f(); } catch (e) { report(e); }", "p.catch((e) => { report(e); });"),
  ],
  [
    "no-object-mutation",
    "src/a.ts",
    lines(
      "const xs: T[] = [];",
      "let c: React.FC = () => null;",
      "class A {",
      "  private readonly ys: Foo.Bar[] = [];",
      "}"
    ),
  ],
];

export const FAIL = [
  [
    "file-size",
    "src/a.ts",
    lines(...Array.from({ length: 401 }, (_, i) => `export const a${i} = ${i};`)),
  ],
  ["fn-size", "src/a.ts", bigFn(50)],
  [
    "nesting",
    "src/a.ts",
    lines(
      "function f(a) {",
      "  if (a) {",
      "    for (const x of a) {",
      "      if (x) {",
      "        while (x) {",
      "          return x;",
      "        }",
      "      }",
      "    }",
      "  }",
      "}"
    ),
  ],
  ["no-console-log", "src/a.ts", lines("console.log(1);")],
  ["no-array-mutation", "src/a.ts", lines("const a = [];", "a.push(1);")],
  ["no-array-mutation", "scripts/x.mjs", lines("const a = [3, 1];", "a.sort();")],
  ["no-object-mutation", "src/a.ts", lines("const o = {};", "o.k = 1;")],
  [
    "no-object-mutation",
    "src/a.ts",
    lines(
      "class A {",
      "  constructor(x) {",
      "    this.x = x;",
      "  }",
      "  set(x) {",
      "    this.x = x;",
      "  }",
      "}"
    ),
  ],
  ["no-object-mutation", "test/x.test.ts", lines("req.session = s;", "db.data.users = [];")],
  ["no-hardcoded-url", "src/a.ts", lines(`export const u = "${URL_HEAD}example.com";`)],
  ["no-hardcoded-url", "src/a.ts", lines(`export const u = \`${HOST}:3000\`;`)],
  ["no-swallowed-error", "src/a.ts", lines("try { f(); } catch (e) {}")],
  ["no-swallowed-error", "src/a.ts", lines("try { f(); } catch {}")],
  [
    "no-swallowed-error",
    "src/a.ts",
    lines("p.catch(() => {});", "q.catch((e) => { return null; });", "r.catch(() => undefined);"),
  ],
  ["no-object-mutation", "src/a.ts", lines("switch (k) {", "  case X: o.a = 1;", "}")],
];
