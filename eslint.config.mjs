import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["build/", "coverage/"]),
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [js.configs.recommended, tseslint.configs.strict],
    rules: {
      "no-undef": "off",
    },
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
]);
