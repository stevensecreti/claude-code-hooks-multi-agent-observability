# Fork Improvements

## Frontend Migration: Vue 3 + Tailwind CSS → React + Chakra UI v3

### Stack Changes

- **Framework:** Vue 3 Composition API → React 19 with hooks
- **Styling:** Tailwind CSS → Chakra UI v3 semantic tokens + CSS custom properties
- **Charts:** Custom canvas renderer → Recharts + `@chakra-ui/charts`
- **Package manager (client):** Bun → pnpm (server still runs on Bun runtime)
- **Workspace:** Added pnpm workspace monorepo (`pnpm-workspace.yaml` + root `package.json`)

### What Was Migrated

- 9 Vue composables → 6 React hooks + 2 pure utility modules
- 13 Vue components → 12 React + Chakra components (HITL card extracted from EventRow)
- Custom toast component → Chakra's built-in `toaster`
- `useMediaQuery` composable → Chakra responsive props (`{{ base: "...", md: "..." }}`)
- Theme system preserved: 12 predefined themes via CSS classes on `<html>`, bridged through Chakra semantic tokens

### ESLint Setup

- Flat config (ESLint 9) with `typescript-eslint`, `react-hooks`, `react-refresh`, `@stylistic`
- Enforced: double quotes, tabs (width 4), `no-explicit-any` as error
- All `any` types replaced with proper interfaces (`EventPayload`, `EventToolInput`, `ChatItem`, `ChatMessageData`, `ChatContent`)

### Files Removed

- All `.vue` components and composables
- `tailwind.config.js`, `postcss.config.js`, `bun.lock`
- `style.css`, `styles/main.css` (replaced), `utils/chartRenderer.ts` (replaced by Recharts)
- Unused Chakra snippets (`rich-text-editor-*`)

### Build

- `pnpm run build` — TypeScript + Vite production build
- `pnpm run lint` / `pnpm run lint:fix` — ESLint
- `just start` / `just client` — dev server on port 47201
