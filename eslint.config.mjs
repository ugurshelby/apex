import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";

// Type-aware rules plus security rules. Existing violations live in
// eslint-suppressions.json and may only shrink (`npx eslint . --prune-suppressions`).
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,
  // The plugin ships its rules as warnings; a gate needs errors.
  {
    rules: Object.fromEntries(
      Object.keys(security.configs.recommended.rules).map((rule) => [rule, "error"]),
    ),
  },
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  { files: ["**/*.{js,mjs,cjs}"], extends: [tseslint.configs.disableTypeChecked] },
  // ImageResponse (Satori) renders plain <img> only; next/image does not exist there.
  {
    files: ["app/**/{opengraph-image,twitter-image,icon,apple-icon}.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Monorepo siblings, local tooling and archives: not part of the app surface.
    ".superpowers/**",
    ".claude/**",
    ".agents/**",
    ".work/**",
    "mobile/**",
    "old-versions-valuable-files/**",
    "pre-plans/**",
    "docs/apex-old-version-valuable-files/**",
  ]),
]);

export default eslintConfig;
