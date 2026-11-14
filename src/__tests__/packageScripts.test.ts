import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import sandboxConfig from "../../sandbox.config.json";

const scripts: Record<string, string> = pkg.scripts;

describe("package scripts", () => {
  it("only invoke scripts that exist", () => {
    const missing = Object.entries(scripts).flatMap(([name, command]) =>
      [...command.matchAll(/bun(?::| run )([\w:.-]+)/g)]
        .map(([, target]) => target)
        .filter((target) => !(target in scripts))
        .map((target) => `${name} -> ${target}`)
    );
    expect(missing).toEqual([]);
  });

  it("CodeSandbox starts an existing script", () => {
    expect(scripts).toHaveProperty([sandboxConfig.container.startScript]);
  });
});
