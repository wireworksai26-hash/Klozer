import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_|^(req|res|next)$", varsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  {
    // CLI entry points are allowed to print.
    files: ["src/config/env.js"],
    rules: { "no-console": "off" },
  },
  {
    // The web chat widget is served to browsers, not run by Node.
    files: ["src/public/**"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser } },
  },
  {
    // Test files need console for debug output and assertions.
    files: ["test/**"],
    rules: { "no-console": "off" },
  },
];
