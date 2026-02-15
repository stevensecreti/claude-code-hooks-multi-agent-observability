# Claude Code Multi Agent Observability

## Instructions
> Follow these instructions as you work through the project.

### Agent Identity

Use `source_app` + `session_id` to uniquely identify an agent. Display as `"source_app:session_id"` with session_id truncated to first 8 characters.

### Zero API Keys Required

Core pipeline is fully local: hooks → HTTP → SQLite → WebSocket → React + Chakra UI v3 dashboard. No API keys needed. Optional features (AI summaries, TTS) require keys — see `.env.sample`.

### Ports

- Server: **47200** (configurable via `SERVER_PORT`)
- Client: **47201** (configurable via `CLIENT_PORT`)
- Client config is in `apps/client/src/config.ts` — if you change server port, update it there too

### Adding Observability to Other Projects

Run `./scripts/setup.sh /path/to/project`. This writes hooks to the target's `.claude/settings.local.json` using absolute paths back to this repo. Zero files copied. `SessionStart` hook auto-starts the server via `scripts/ensure-running.sh`.

### Key Files

- `scripts/setup.sh` — generates hooks config for external projects
- `scripts/ensure-running.sh` — auto-starts server+client if not running (called from SessionStart hook)
- `.claude/hooks/send_event.py` — universal event sender for all 12 hook types. No external deps beyond `python-dotenv`. `--summarize` flag lazy-imports anthropic and degrades silently if missing.
- `.claude/settings.json` — this repo's own hooks (uses `$CLAUDE_PROJECT_DIR` relative paths)
- `apps/server/events.db` — SQLite database. Persistent across restarts. `just db-reset` to nuke it.

### Known Gotchas

- Paths with spaces (e.g. `VSCode Projects`) must be quoted in hook commands. `setup.sh` handles this automatically.
- `ensure-running.sh` runs `pnpm install` (client) / `bun install` (server) if `node_modules` is missing — first auto-start may be slow.
- The client "Clear events" button is UI-only. Events persist in SQLite.
- `apps/demo-cc-agent/` was removed — use `setup.sh` instead.
