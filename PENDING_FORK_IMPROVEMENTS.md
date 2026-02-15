# Pending Fork Improvements

## 1. Server: Bun → pnpm

Migrate `apps/server/` from `bun install` to `pnpm install` for consistency with the client. Bun remains the runtime (`bun run dev`), but dependency management unifies under pnpm.

**Scope:**

- Replace `bun install` with `pnpm install` in `justfile`, `scripts/ensure-running.sh`, `scripts/setup.sh`
- Add `apps/server/` to `pnpm-workspace.yaml` (already listed but currently uses bun for deps)
- Remove `apps/server/bun.lock`, generate `pnpm-lock.yaml`
- Update `apps/server/CLAUDE.md` to reflect pnpm for deps, bun for runtime
- Replace `bun:sqlite` with a portable SQLite package (see next item) since `bun:sqlite` is bun-runtime-only

## 2. Database: SQLite → MongoDB (Docker)

Current: `bun:sqlite` with a single `events.db` file. Payloads stored as JSON text in a `TEXT` column, parsed on read.

**Why MongoDB fits:**

- Event payloads are already schemaless JSON — MongoDB stores them natively without serialize/deserialize
- Aggregation pipeline maps directly to planned analytics (events by agent, tool usage frequency, session timelines, HITL response times)
- TTL indexes for automatic event expiration (no manual cleanup)
- Flexible indexing on nested payload fields (`payload.tool_name`, `payload.tool_input.command`)
- `$group`, `$bucket`, `$dateHistogram` cover the chart data aggregation currently done client-side in `useChartData`

**Scope:**

- Add `docker-compose.yml` at repo root with MongoDB 7 container (persistent volume)
- Replace `src/db.ts` (`bun:sqlite`) with a MongoDB client (Mongoose or native `mongodb` driver)
- Migrate schema: `events` collection, `themes` collection
- Add compound indexes: `{ source_app: 1, session_id: 1, timestamp: -1 }`, `{ hook_event_type: 1 }`
- Add `just db-start` / `just db-stop` recipes for Docker lifecycle
- Update `scripts/ensure-running.sh` to health-check MongoDB before server start
- Move chart-data time-bucket aggregation from client hook to a server `/api/chart-data` endpoint using `$bucket`

## 3. UI Enhancements

Issues observed during the React migration:

- **Bundle size:** Single 1.1MB JS chunk. Add `build.rollupOptions.output.manualChunks` to split Recharts and Chakra into separate vendor chunks.
- **Chat transcript types:** `ChatItem` fields are mostly optional — tighten the types once server-side chat format is documented.
- **Empty state polish:** `EventTimeline` and chart components show minimal empty states. Add illustrations or contextual guidance (e.g., "Waiting for events... run `just setup /path/to/project` to connect an agent").
- **Chart server-side aggregation:** Once MongoDB is in place, `useChartData` client-side bucketing can be replaced with a server endpoint, reducing client CPU and enabling longer time windows without shipping all raw events over WebSocket.
- **Filter persistence:** Filters reset on page reload. Persist active filters + time range in URL search params or localStorage.
- **Theme creator UI:** The `ThemeManager` dialog has full CRUD for custom themes but no color picker — just raw hex input. Add a color picker component.
- **Accessibility:** Run an axe audit. Known gaps: chart components lack ARIA labels, color-only status indicators (connection dot) need text alternatives.
