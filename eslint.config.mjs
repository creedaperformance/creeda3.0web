import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // CREEDA still has legacy dynamic decision-engine and Supabase payloads.
      // Keep this out of the release lint gate until those contracts are typed deliberately.
      "@typescript-eslint/no-explicit-any": "off",
      // Legacy engines and audit scripts retain intermediate variables while product contracts are consolidated.
      // TypeScript/build still catch unresolved symbols; the release lint gate should focus on executable defects.
      "@typescript-eslint/no-unused-vars": "off",
      // Avatar/media URLs are runtime/user-supplied in several role surfaces, where next/image remote config is unsafe to infer.
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "mobile/**",
    // Local/generated tool workspaces and editor state are not part of the app lint surface.
    ".claude/**",
    ".expo/**",
    ".vscode/**",
    ".auth/**",
    ".playwright-cli/**",
    "playwright-report/**",
    "coverage/**",
    "test-results/**",
    "artifacts/**",
  ]),
]);

export default eslintConfig;
