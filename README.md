# Multi-Agent Observability System

Real-time monitoring and visualization for Claude Code agents through comprehensive hook event tracking. Watch the [latest deep dive on multi-agent orchestration with Opus 4.6 here](https://youtu.be/RpUTF_U4kiw). With Claude Opus 4.6 and multi-agent orchestration, you can now spin up teams of specialized agents that work in parallel, and this observability system lets you trace every tool call, task handoff, and agent lifecycle event across the entire swarm.

## Overview

This system provides complete observability into Claude Code agent behavior by capturing, storing, and visualizing Claude Code [Hook events](https://docs.anthropic.com/en/docs/claude-code/hooks) in real-time. It enables monitoring of multiple concurrent agents with session tracking, event filtering, and live updates.

**Zero API keys required.** The entire pipeline runs locally: hooks → HTTP → SQLite → WebSocket → Vue dashboard.

<img src="images/app.png" alt="Multi-Agent Observability Dashboard" style="max-width: 800px; width: 100%;">

## Architecture

```
Claude Agents → Hook Scripts → HTTP POST → Bun Server → SQLite → WebSocket → Vue Client
```

![Agent Data Flow Animation](images/AgentDataFlowV2.gif)

## Quick Start

### Prerequisites

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - Anthropic's official CLI for Claude
- **[Astral uv](https://docs.astral.sh/uv/)** - Fast Python package manager (required for hook scripts)
- **[Bun](https://bun.sh/)** - For running the server and client
- **[just](https://github.com/casey/just)** (optional) - Command runner for project recipes

### 1. Install

```bash
git clone https://github.com/anthropics/claude-code-hooks-multi-agent-observability.git
cd claude-code-hooks-multi-agent-observability
just install
# or without just:
cd apps/server && bun install && cd ../client && bun install
```

### 2. Start the Dashboard

```bash
just start
# Server starts on http://localhost:47200
# Dashboard opens at http://localhost:47201
```

### 3. Add Observability to Your Project

```bash
./scripts/setup.sh /path/to/your/project
```

That's it. No files are copied — the setup script writes hooks config to your project's `.claude/settings.local.json` using absolute paths back to this repo's `send_event.py`. The `.local.json` file is gitignored by Claude Code, so absolute paths stay out of version control.

Now open Claude Code in your project and watch events stream into the dashboard.

## Adding Observability to Your Project

### Option A: Setup Script (Recommended)

```bash
./scripts/setup.sh /path/to/your/project
```

The script:
- Derives `--source-app` from your project's directory name (or use `--source-app custom-name`)
- Generates hooks for all 12 event types
- Writes to `.claude/settings.local.json` (gitignored — no absolute paths in your repo)
- Copies zero files

You can also use the `just` shorthand:
```bash
just setup /path/to/your/project
```

### Option B: Setup Prompt

If you prefer working within Claude Code, copy the prompt from `scripts/setup-prompt.md` and paste it into Claude Code in your target project. It will generate the same hooks config.

### What Gets Configured

All 12 Claude Code hook event types are configured:

| Event Type | What It Captures |
|---|---|
| SessionStart | Session begins with agent type & model |
| SessionEnd | Session ends with reason |
| UserPromptSubmit | Every user prompt |
| PreToolUse | Before tool execution |
| PostToolUse | After tool completion |
| PostToolUseFailure | Tool execution failures |
| PermissionRequest | Permission prompts |
| Notification | User interaction events |
| SubagentStart | Subagent spawned |
| SubagentStop | Subagent completed (includes transcript) |
| Stop | Response completion (includes transcript) |
| PreCompact | Context compaction |

## Using `just`

```bash
just              # List all available recipes
just start        # Start server + client
just stop         # Stop all processes
just restart      # Stop then start
just server       # Start server only (dev mode)
just client       # Start client only
just install      # Install all dependencies
just health       # Check server/client status
just test-event   # Send a test event
just db-reset     # Reset the database
just hooks        # List all hook scripts
just open         # Open dashboard in browser
just setup <dir>  # Add hooks to another project
```

## Project Structure

```
claude-code-hooks-multi-agent-observability/
│
├── apps/
│   ├── server/             # Bun TypeScript server (port 47200)
│   │   ├── src/
│   │   │   ├── index.ts    # HTTP/WebSocket endpoints
│   │   │   ├── db.ts       # SQLite database & migrations
│   │   │   └── types.ts    # TypeScript interfaces
│   │   └── events.db       # SQLite database (gitignored)
│   │
│   └── client/             # Vue 3 TypeScript dashboard (port 47201)
│       ├── src/
│       │   ├── App.vue
│       │   ├── components/
│       │   ├── composables/
│       │   └── types.ts
│       └── package.json
│
├── .claude/                # Claude Code integration
│   ├── hooks/             # Hook scripts (Python + uv)
│   │   ├── send_event.py          # Universal event sender (all 12 types)
│   │   ├── pre_tool_use.py        # Tool validation & blocking
│   │   ├── post_tool_use.py       # Result logging
│   │   ├── notification.py        # User interaction events
│   │   ├── user_prompt_submit.py  # User prompt logging
│   │   ├── stop.py               # Session completion
│   │   ├── subagent_stop.py      # Subagent completion
│   │   ├── subagent_start.py     # Subagent lifecycle start
│   │   ├── pre_compact.py        # Context compaction
│   │   ├── session_start.py      # Session start
│   │   ├── session_end.py        # Session end
│   │   ├── post_tool_use_failure.py # Tool failure logging
│   │   └── permission_request.py # Permission request logging
│   │
│   ├── agents/team/       # Agent team definitions
│   └── settings.json      # Hook configuration (all 12 events)
│
├── scripts/
│   ├── setup.sh           # Add observability to any project
│   ├── setup-prompt.md    # Prompt-based setup alternative
│   ├── start-system.sh    # Launch server & client
│   └── reset-system.sh    # Stop all processes
│
└── justfile               # Task runner recipes
```

## Data Flow

1. **Event Generation**: Claude Code executes an action (tool use, notification, etc.)
2. **Hook Activation**: Corresponding hook script runs based on `settings.json`
3. **Data Collection**: Hook script gathers context (tool name, inputs, session ID)
4. **Transmission**: `send_event.py` sends JSON payload to server via HTTP POST
5. **Storage & Broadcast**: Server stores in SQLite and broadcasts to WebSocket clients
6. **Dashboard Update**: Vue app receives event and updates timeline in real-time

All data persists in SQLite (`apps/server/events.db`) for long-term retrospective analysis. Stop and restart the server — your data is still there.

## Event Types & Visualization

| Event Type | Emoji | Purpose | Special Display |
|---|---|---|---|
| PreToolUse | 🔧 | Before tool execution | Tool name + tool emoji |
| PostToolUse | ✅ | After tool completion | Tool name + results |
| PostToolUseFailure | ❌ | Tool execution failed | Error details |
| PermissionRequest | 🔐 | Permission requested | Permission suggestions |
| Notification | 🔔 | User interactions | Message & type |
| Stop | 🛑 | Response completion | Chat transcript |
| SubagentStart | 🟢 | Subagent started | Agent ID & type |
| SubagentStop | 👥 | Subagent finished | Agent transcript |
| PreCompact | 📦 | Context compaction | Custom instructions |
| UserPromptSubmit | 💬 | User prompt | _"user message"_ |
| SessionStart | 🚀 | Session started | Source, model & type |
| SessionEnd | 🏁 | Session ended | End reason |

## Configuration

### Environment Variables

Copy `.env.sample` to `.env` to customize optional features:

- `ENGINEER_NAME` — Your name (for TTS notifications)
- `ANTHROPIC_API_KEY` — Optional: AI-generated event summaries (add `--summarize` to hooks)
- `OPENAI_API_KEY` / `ELEVENLABS_API_KEY` — Optional: TTS notifications

### Ports

| Service | Default Port | Env Var |
|---|---|---|
| Server | 47200 | `SERVER_PORT` |
| Client | 47201 | `CLIENT_PORT` |

Ports are configurable via environment variables or `.env` file.

## Multi-Agent Orchestration & Observability

[![Multi-Agent Orchestration with Claude Code](images/claude-code-multi-agent-orchestration.png)](https://youtu.be/RpUTF_U4kiw)

When you have multiple agents running in parallel — each with their own context window, session ID, and task assignments — you need visibility into what's happening across the swarm. This observability system lets you:

- **Trace every tool call** across all agents in real-time
- **Filter by agent swim lane** to inspect individual agent behavior
- **Track task lifecycle** — see TaskCreate, TaskUpdate, and SendMessage events flow between agents
- **Spot failures early** — PostToolUseFailure and PermissionRequest events surface issues before they cascade
- **Measure throughput** — the live pulse chart shows activity density across your agent fleet

See the official [Claude Code Agent Teams documentation](https://code.claude.com/docs/en/agent-teams) for the full reference on multi-agent orchestration.

## Testing

```bash
# Send a test event
just test-event

# Check server/client health
just health

# Manual event test
curl -X POST http://localhost:47200/events \
  -H "Content-Type: application/json" \
  -d '{
    "source_app": "test",
    "session_id": "test-123",
    "hook_event_type": "PreToolUse",
    "payload": {"tool_name": "Bash", "tool_input": {"command": "ls"}}
  }'
```

## Security Features

- Blocks dangerous `rm -rf` commands via `deny_tool()` JSON pattern
- Prevents access to sensitive files (`.env`, private keys)
- `stop_hook_active` guard prevents infinite hook loops
- Stop hook validators ensure plan files contain required sections

## Technical Stack

- **Server**: Bun, TypeScript, SQLite
- **Client**: Vue 3, TypeScript, Vite, Tailwind CSS
- **Hooks**: Python 3.11+, Astral uv
- **Communication**: HTTP REST, WebSocket

## Master AI Agentic Coding

Learn tactical agentic coding patterns with [Tactical Agentic Coding](https://agenticengineer.com/tactical-agentic-coding?y=opsorch)

Follow the [IndyDevDan YouTube channel](https://www.youtube.com/@indydevdan) to improve your agentic coding advantage.
