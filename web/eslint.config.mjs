import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // core/ 내부에서 외부 세계(React/Next/앱 레이어) import 차단
  {
    files: ["core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "react",
            "react-*",
            "next",
            "next/*",
            "@/app/*",
            "@/lib/*",
            "@/content/*",
            "@/components/*",
            "**/app/*",
            "**/lib/*",
            "**/content/*",
            "**/components/*",
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
