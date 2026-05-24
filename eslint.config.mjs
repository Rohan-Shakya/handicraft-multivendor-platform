import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // Base JS + TS recommended rules
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Global rules (all TS/TSX files) ──────────────────────────────────────
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      // Import ordering
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Unused imports & vars
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // Disable base rule — unused-imports handles it
      "@typescript-eslint/no-unused-vars": "off",

      // Reasonable TS rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  // ── React files (storefront + admin) ─────────────────────────────────────
  {
    files: ["apps/storefront/**/*.{ts,tsx}", "apps/admin/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // ── Ignored paths ─────────────────────────────────────────────────────────
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "**/drizzle/**",
      "**/*.config.*",
    ],
  }
);
