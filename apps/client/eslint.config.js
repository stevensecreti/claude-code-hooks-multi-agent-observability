import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import stylistic from "@stylistic/eslint-plugin";

export default tseslint.config(
	{
		ignores: ["dist/", "node_modules/", "src/components/ui/"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.{ts,tsx}"],
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
			"@stylistic": stylistic,
		},
		rules: {
			// ── React ──────────────────────────────────────────
			...reactHooks.configs.recommended.rules,
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],

			// ── Style: User preferences ────────────────────────
			"@stylistic/quotes": ["error", "double"],
			"@stylistic/indent": ["error", "tab"],
			"@stylistic/no-tabs": "off",
			"@stylistic/semi": ["error", "always"],
			"@stylistic/jsx-quotes": ["error", "prefer-double"],

			// ── Style: Consistency ─────────────────────────────
			"@stylistic/comma-dangle": ["error", "always-multiline"],
			"@stylistic/brace-style": ["error", "1tbs"],
			"@stylistic/arrow-parens": ["error", "always"],
			"@stylistic/eol-last": ["error", "always"],
			"@stylistic/no-trailing-spaces": "error",
			"@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxEOF: 1 }],
			"@stylistic/object-curly-spacing": ["error", "always"],
			"@stylistic/array-bracket-spacing": ["error", "never"],
			"@stylistic/block-spacing": ["error", "always"],
			"@stylistic/comma-spacing": ["error", { before: false, after: true }],
			"@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
			"@stylistic/keyword-spacing": ["error", { before: true, after: true }],
			"@stylistic/space-before-blocks": ["error", "always"],
			"@stylistic/space-infix-ops": "error",
			"@stylistic/jsx-closing-bracket-location": ["error", "tag-aligned"],
			"@stylistic/jsx-closing-tag-location": "error",
			"@stylistic/jsx-indent-props": ["error", "tab"],
			"@stylistic/jsx-tag-spacing": ["error", { beforeSelfClosing: "always" }],

			// ── TypeScript ─────────────────────────────────────
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports" },
			],

			// ── General ────────────────────────────────────────
			"no-console": ["warn", { allow: ["warn", "error"] }],
			"prefer-const": "error",
			"no-var": "error",
			"eqeqeq": ["error", "always"],
		},
	},
);
