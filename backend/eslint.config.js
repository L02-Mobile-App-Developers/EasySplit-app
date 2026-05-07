// @ts-check
const tseslint = require("typescript-eslint");

module.exports = [
  {
    ignores: ["dist/", "coverage/", "prisma/", "node_modules/"],
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn"],
      "@typescript-eslint/no-explicit-any": ["warn"],
      "no-console": ["warn"],
    },
  },
];
