# Pending Fork Improvements

## Server Runtime: Bun → Node.js

The server currently uses `Bun.serve()` and Bun-specific APIs inherited from the original codebase. Migrate to standard Node.js runtime.

**Scope:**

- Replace `Bun.serve()` with a standard HTTP server (e.g. native `node:http` or Hono)
- Replace `bun --watch` with `tsx --watch` or similar
- Update `package.json` scripts, `justfile`, and startup scripts
- Remove `@types/bun` dev dependency
- Ensure WebSocket support works without Bun built-ins

## Server Test Suite

No tests exist yet. Add test coverage for:

- `db.ts` — CRUD operations, chart data aggregation pipeline, HITL response updates
- `index.ts` — HTTP endpoints (/health, POST /events, GET /events/recent, /api/chart-data, HITL hex ID respond), WebSocket broadcast
- `theme.ts` — validation, search, export/import

## UI Enhancements

Issues observed during the React migration:

- **Bundle size:** Single 1.1MB JS chunk. Add `build.rollupOptions.output.manualChunks` to split Recharts and Chakra into separate vendor chunks.
- **Chat transcript types:** `ChatItem` fields are mostly optional — tighten the types once server-side chat format is documented.
- **Empty state polish:** `EventTimeline` and chart components show minimal empty states. Add illustrations or contextual guidance (e.g., "Waiting for events... run `just setup /path/to/project` to connect an agent").
- **Filter persistence:** Filters reset on page reload. Persist active filters + time range in URL search params or localStorage.
- **Theme creator UI:** The `ThemeManager` dialog has full CRUD for custom themes but no color picker — just raw hex input. Add a color picker component.
- **Accessibility:** Run an axe audit. Known gaps: chart components lack ARIA labels, color-only status indicators (connection dot) need text alternatives.
