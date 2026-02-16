---
description: Server conventions — pnpm workspace, MongoDB, TypeScript.
globs: "*.ts, *.js, package.json"
alwaysApply: false
---

# Server

pnpm workspace monorepo. `pnpm install` at the repo root.

> **Note:** The server currently uses `Bun.serve()` as a legacy of the original codebase. This is slated for migration to a standard Node.js runtime. Do not introduce new Bun-specific APIs.

## Database

MongoDB via the native `mongodb` driver (not Mongoose). Runs in Docker on port **47217**.

- `docker compose up -d` — start MongoDB container
- `docker compose stop mongodb` — stop it
- `just db-reset` — drop the database
- All db functions are async. Payloads store as native BSON — no `JSON.stringify`/`JSON.parse`.
- Connection URI default: `mongodb://localhost:47217/observability`

## Endpoints

- `GET /health` — MongoDB connectivity check
- `POST /events` — ingest hook events
- `GET /events/recent` — fetch recent events
- `GET /api/chart-data?range=1m` — server-side aggregated chart buckets
- `POST /events/:hexId/respond` — HITL response (24-char hex ObjectId)
- `GET /stream` (WebSocket) — real-time event broadcast

## Conventions

- Event IDs are MongoDB ObjectId hex strings (not integers)
- `HookEvent.id` is `string` in both server and client types
- Theme IDs are random alphanumeric strings (not ObjectIds)
