import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Error에서 Warning으로 변경
      "@typescript-eslint/no-unused-vars": "warn", // 사용되지 않는 변수도 Warning으로
      "prefer-const": "warn", // prefer-const도 Warning으로
    },
  },
];

export default eslintConfig;
