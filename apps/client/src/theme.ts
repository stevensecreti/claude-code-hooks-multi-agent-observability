import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
	theme: {
		semanticTokens: {
			colors: {
				"app.bg": { value: "var(--theme-bg-secondary)" },
				"app.bgPrimary": { value: "var(--theme-bg-primary)" },
				"app.bgTertiary": { value: "var(--theme-bg-tertiary)" },
				"app.bgQuaternary": { value: "var(--theme-bg-quaternary)" },
				"app.text": { value: "var(--theme-text-primary)" },
				"app.textSecondary": { value: "var(--theme-text-secondary)" },
				"app.textTertiary": { value: "var(--theme-text-tertiary)" },
				"app.textQuaternary": { value: "var(--theme-text-quaternary)" },
				"app.primary": { value: "var(--theme-primary)" },
				"app.primaryHover": { value: "var(--theme-primary-hover)" },
				"app.primaryLight": { value: "var(--theme-primary-light)" },
				"app.primaryDark": { value: "var(--theme-primary-dark)" },
				"app.border": { value: "var(--theme-border-primary)" },
				"app.borderSecondary": { value: "var(--theme-border-secondary)" },
				"app.success": { value: "var(--theme-accent-success)" },
				"app.warning": { value: "var(--theme-accent-warning)" },
				"app.error": { value: "var(--theme-accent-error)" },
				"app.info": { value: "var(--theme-accent-info)" },
			},
		},
	},
});

export const system = createSystem(defaultConfig, config);
