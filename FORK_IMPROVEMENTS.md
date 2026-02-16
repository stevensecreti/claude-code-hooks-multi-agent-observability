# Fork Improvements

## Frontend Migration: Vue 3 + Tailwind CSS → React + Chakra UI v3

### Stack Changes

- **Framework:** Vue 3 Composition API → React 19 with hooks
- **Styling:** Tailwind CSS → Chakra UI v3 semantic tokens + CSS custom properties
- **Charts:** Custom canvas renderer → Recharts + `@chakra-ui/charts`
- **Package manager (client):** Bun → pnpm
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

## Server Dependency Management: Bun → pnpm

Unified dependency management across the monorepo under pnpm.

### Changes

- Replaced `bun install` with `pnpm install` in `justfile`, `scripts/ensure-running.sh`
- Removed `apps/server/bun.lock` (pnpm workspace lockfile at root covers server)
- Updated `apps/server/CLAUDE.md` to reflect pnpm for deps, bun for runtime
- `pnpm-workspace.yaml` already included `apps/*` — now actively used for server deps

## Database: SQLite → MongoDB (Docker)

Replaced `bun:sqlite` with the native `mongodb` driver. MongoDB runs in Docker via `docker-compose.yml`.

### Stack Changes

- **Database:** `bun:sqlite` (single `events.db` file) → MongoDB 7 (Docker container, persistent volume)
- **Driver:** Native `mongodb` ^6.12.0 (not Mongoose)
- **Port:** 47217 (avoids conflict with standard 27017)

### What Changed

- `apps/server/src/db.ts` — full rewrite: all functions async, native BSON storage (no JSON.stringify/parse), `$group` aggregation pipeline for chart data, retry connection loop, graceful shutdown
- `apps/server/src/index.ts` — `await initDatabase()`, added `/health` endpoint (MongoDB status), added `/api/chart-data` endpoint, HITL regex updated for hex ObjectIds, fixed default port to 47200, graceful SIGINT/SIGTERM shutdown
- `apps/server/src/theme.ts` — all db calls now `await`ed
- `apps/server/src/types.ts` — `HookEvent.id`: `number` → `string`, added `ChartDataPoint`, `ChartDataResponse`, `TIME_RANGE_CONFIG`
- `apps/server/package.json` — added `mongodb`, removed unused `sqlite`/`sqlite3`
- `apps/client/src/types.ts` — `HookEvent.id`: `number` → `string`
- `apps/client/src/hooks/useChartData.ts` — 301 lines of client-side bucketing → ~130 lines polling `/api/chart-data` every 2s

### Infrastructure

- `docker-compose.yml` — MongoDB 7 container, health check, named volume, port 47217
- `scripts/start-system.sh` — `docker compose up -d` + MongoDB health wait before server
- `scripts/reset-system.sh` — fixed port defaults (47200/47201), replaced SQLite WAL cleanup with MongoDB stop
- `scripts/ensure-running.sh` — `docker compose up -d` before server start, idempotent (exits early if already running)
- `justfile` — `db-start`/`db-stop`/`db-reset` replace SQLite file recipes

### Removed

- `bun:sqlite` import, all SQLite schema migrations, WAL/PRAGMA config
- `sqlite`/`sqlite3` deps from package.json
- `events.db` / `events.db-wal` / `events.db-shm` (gitignored, local artifacts)

## Server Runtime: Bun → Node.js (Hono + tsx)

Replaced `Bun.serve()` and all Bun-specific APIs with standard Node.js runtime.

### Stack Changes

- **HTTP framework:** `Bun.serve()` → Hono + `@hono/node-server`
- **WebSocket:** Bun built-in WebSocket → `@hono/node-ws` (uses `ws` under the hood)
- **TypeScript execution:** `bun` / `bun --watch` → `tsx` / `tsx --watch`
- **Types:** `@types/bun` / `bun-types` → `@types/node`

### What Changed

- `apps/server/src/index.ts` — full rewrite: `Bun.serve()` → Hono routes with `cors()` middleware, `createNodeWebSocket()` for WebSocket, `serve()` from `@hono/node-server`, `WebSocket` import from `ws` for HITL agent communication
- `apps/server/package.json` — added `hono`, `@hono/node-server`, `@hono/node-ws`, `ws`, `tsx`, `@types/node`; removed `@types/bun`, `module` field; updated scripts to use `tsx`
- `apps/server/tsconfig.json` — `"types": ["bun-types"]` → `"types": ["node"]`
- `apps/server/src/db.ts` — fixed type casts for `@types/node` compatibility (`String(row._id)`, typed topology access)
- `apps/server/src/theme.ts` — typed `tag` parameter as `unknown` instead of implicit `any`
- `scripts/ensure-running.sh` — `bun run dev` → `pnpm run dev`
- `scripts/start-system.sh` — `bun run dev` → `pnpm run dev` (server and client)
- `scripts/reset-system.sh` — process cleanup looks for `tsx`/`node` instead of `bun`; manual instructions updated
- `justfile` — all server recipes use `pnpm run` instead of `bun run`; section comment updated
- `apps/server/CLAUDE.md` — updated to reflect Node.js/Hono/tsx runtime
