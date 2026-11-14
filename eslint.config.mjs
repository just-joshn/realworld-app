import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["build/"]),
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [js.configs.recommended, tseslint.configs.strict],
    rules: {
      // TypeScript reports undefined identifiers; this rule misreads type-only globals.
      "no-undef": "off",
    },
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
]);
