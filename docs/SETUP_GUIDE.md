# Setup Guide: Adding Observability to Your Project

Add real-time observability to any Claude Code project in under a minute. Zero file copying, zero API keys, fully self-contained — the dashboard auto-starts when you open Claude Code.

## Prerequisites

Make sure these are installed on your machine (one-time setup):

| Tool | Why | Install |
|------|-----|---------|
| [Bun](https://bun.sh/) | Runs the server + dashboard | `curl -fsSL https://bun.sh/install \| bash` |
| [Astral uv](https://docs.astral.sh/uv/) | Runs Python hook scripts | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| [just](https://github.com/casey/just) | Optional task runner | `brew install just` |

## Step 1: Clone & Install the Observability Repo

```bash
# Clone this repo somewhere permanent on your machine
git clone https://github.com/anthropics/claude-code-hooks-multi-agent-observability.git ~/observability

# Install server + client dependencies
cd ~/observability
just install
# or without just:
# cd apps/server && bun install && cd ../client && bun install
```

> Pick any location you like — `~/observability` is used as an example throughout this guide. The setup script resolves absolute paths, so the location doesn't matter.

## Step 2: Add Hooks to Your Project

```bash
~/observability/scripts/setup.sh /path/to/your/project
```

That's it. This:
1. Generates hooks for all 12 Claude Code event types
2. Wires in `ensure-running.sh` on `SessionStart` (auto-starts the server)
3. Writes everything to `.claude/settings.local.json` in your project

**No files are copied.** The hooks use absolute paths back to the observability repo.

### Custom source-app name

By default, the source app name is derived from your project's directory name. Override it with:

```bash
~/observability/scripts/setup.sh /path/to/your/project --source-app my-cool-app
```

This name appears in the dashboard to identify events from this project.

### Multiple projects

Run setup for each project. Each gets its own `--source-app` name, and you can filter by source app in the dashboard:

```bash
~/observability/scripts/setup.sh ~/projects/api-server
~/observability/scripts/setup.sh ~/projects/frontend-app
~/observability/scripts/setup.sh ~/projects/ml-pipeline --source-app ml-pipe
```

## Step 3: Use Claude Code

Open Claude Code in your project:

```bash
cd /path/to/your/project
claude
```

On `SessionStart`, the `ensure-running.sh` hook automatically:
1. Checks if the observability server is running (fast 300ms health check)
2. If not, starts the server (port 47200) and dashboard (port 47201) in the background
3. Exits quickly so it doesn't block Claude Code startup

Open the dashboard at **http://localhost:47201** and watch events stream in.

## How It Works

```
Your Project                          Observability Repo
─────────────                         ──────────────────
.claude/settings.local.json           scripts/ensure-running.sh
  │                                     │ (auto-starts server if needed)
  │ SessionStart hook ──────────────────┘
  │                                   .claude/hooks/send_event.py
  │ All hooks ──────────────────────────┘
  │   (PreToolUse, PostToolUse,         │
  │    Notification, Stop, etc.)        │ HTTP POST
  │                                     ▼
  │                                   apps/server/ (port 47200)
  │                                     │ SQLite + WebSocket
  │                                     ▼
  │                                   apps/client/ (port 47201)
  └─────────────────────────────────── Dashboard
```

Key points:
- **Zero files copied** to your project — only a JSON config in `.claude/settings.local.json`
- **`.local.json` is gitignored** by Claude Code — absolute paths stay out of version control
- **Self-contained startup** — the dashboard starts automatically, no manual intervention
- **Zero API keys** — the entire pipeline is local (hooks → HTTP → SQLite → WebSocket → Vue)
- **Data persists** in `apps/server/events.db` (SQLite) — restart the server and your history is still there

## What Gets Captured

All 12 Claude Code hook events are wired up:

| Event | When It Fires | Notable Data |
|-------|--------------|--------------|
| **SessionStart** | Claude Code session begins | Model name, agent type, also triggers auto-start |
| **SessionEnd** | Session ends | Exit reason |
| **UserPromptSubmit** | You type a prompt | Your prompt text |
| **PreToolUse** | Before a tool runs | Tool name, input parameters |
| **PostToolUse** | After a tool completes | Tool name, output/results |
| **PostToolUseFailure** | A tool fails | Error message, interrupt status |
| **PermissionRequest** | Permission prompt shown | Tool name, suggestions |
| **Notification** | Agent sends notification | Message, notification type |
| **SubagentStart** | A subagent is spawned | Agent ID, agent type |
| **SubagentStop** | A subagent finishes | Agent ID, full transcript (via `--add-chat`) |
| **Stop** | Agent response complete | Full transcript (via `--add-chat`) |
| **PreCompact** | Context being compacted | Custom instructions |

## Managing the Observability System

### Check status

```bash
cd ~/observability && just health
# or:
curl -sf http://localhost:47200/health && echo "Server: UP" || echo "Server: DOWN"
```

### Manual start / stop

```bash
# Foreground (Ctrl+C to stop both)
cd ~/observability && just start

# Stop all processes
cd ~/observability && just stop
```

### View logs (if auto-started from hook)

```bash
cat /tmp/observability-startup.log
```

### Reset the database

```bash
cd ~/observability && just db-reset
```

### Send a test event

```bash
cd ~/observability && just test-event
```

## Customizing Ports

Default ports are **47200** (server) and **47201** (client). To change them:

```bash
# Via environment variables
SERVER_PORT=9000 CLIENT_PORT=9001 ~/observability/scripts/setup.sh /path/to/your/project

# Or set them in ~/observability/.env
echo "SERVER_PORT=9000" >> ~/observability/.env
echo "CLIENT_PORT=9001" >> ~/observability/.env
```

If you change ports after setup, re-run the setup script to regenerate the hooks config.

## What setup.sh Writes

Here's an example of what gets written to `.claude/settings.local.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/Users/you/observability/scripts/ensure-running.sh"
          },
          {
            "type": "command",
            "command": "uv run /Users/you/observability/.claude/hooks/send_event.py --source-app my-project --event-type SessionStart --server-url http://localhost:47200/events"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "uv run /Users/you/observability/.claude/hooks/send_event.py --source-app my-project --event-type PreToolUse --server-url http://localhost:47200/events"
          }
        ]
      }
    ]
  }
}
```

Note: `SessionStart` has two hooks — `ensure-running.sh` runs first to auto-start the server, then `send_event.py` sends the event. All other event types only have `send_event.py`.

## Removing Observability

Delete the settings file from your project:

```bash
rm /path/to/your/project/.claude/settings.local.json
```

Or, if you have other settings in that file, just remove the `"hooks"` key.

## Troubleshooting

### Events not appearing in dashboard

1. Check the server is running: `curl http://localhost:47200/health`
2. Check startup logs: `cat /tmp/observability-startup.log`
3. Send a manual test event:
   ```bash
   curl -X POST http://localhost:47200/events \
     -H "Content-Type: application/json" \
     -d '{"source_app":"test","session_id":"test-123","hook_event_type":"PreToolUse","payload":{"tool_name":"Bash"}}'
   ```
4. Check that `.claude/settings.local.json` exists in your project and has the hooks

### Port conflicts

If port 47200 or 47201 is in use, set custom ports:
```bash
SERVER_PORT=9000 CLIENT_PORT=9001 ~/observability/scripts/setup.sh /path/to/your/project
```

### Hook script errors

Test a hook directly:
```bash
echo '{"session_id":"test","tool_name":"Bash"}' | \
  uv run ~/observability/.claude/hooks/send_event.py \
    --source-app test --event-type PreToolUse \
    --server-url http://localhost:47200/events
```

### Auto-start not working

The `ensure-running.sh` script uses `bun run dev` to start processes. Make sure `bun` is on your PATH in the shell environment that Claude Code uses. You can test:
```bash
~/observability/scripts/ensure-running.sh && echo "OK"
```
