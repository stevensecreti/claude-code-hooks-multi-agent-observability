# Testing Guide: Multi-Agent Observability System

## ✅ Prerequisites

The test project is fully configured and ready to use:
- ✅ Hooks configured in `.claude/settings.local.json`
- ✅ TypeScript project with calculator module and tests
- ✅ Server is running on port 47200
- ✅ MongoDB is running (Docker)

## 🚀 How to Test

### Step 1: Open Claude Code in Test Project

**That's it!** The system auto-starts when you open Claude Code:

```bash
cd /Users/stevensecreti/VSCode\ Projects/claude-code-hooks-multi-agent-observability/test-project
claude
```

**What happens automatically:**
1. 🔄 The `SessionStart` hook runs `ensure-running.sh`
2. 🐳 Docker MongoDB starts (if not running)
3. 🖥️  Server starts on port 47200 (if not running)
4. 🎨 **Client dashboard starts on port 47201** (if not running)
5. 🚀 You see the SessionStart event in the dashboard!

### Step 2: Open the Dashboard

The dashboard **auto-starts** at **http://localhost:47201** — just open it in your browser!

```bash
# Or use this shortcut to open it
open http://localhost:47201
```

### Step 3: Use Ready-Made Test Prompts

**See `TEST_PROMPTS.md` for copy-paste test scenarios!**

#### 🎯 Recommended: Multi-Agent Code Analysis (Read-Only)

Copy this into Claude Code:

```
I need you to analyze this codebase using an agent team. Create 3 specialized agents working in parallel:

1. Code Analyst (Haiku): Read calculator.ts and analyze the implementations
2. Test Reviewer (Haiku): Read calculator.test.ts and evaluate test coverage
3. Documentation Auditor (Sonnet): Read package.json, tsconfig.json, vitest.config.ts

Each agent should only READ files (no writes). Report findings back.
```

**What you'll see:**
- 🟢 3 × SubagentStart events (one for each specialist)
- 🔧 Multiple PreToolUse (Read) events from parallel agents
- ✅ PostToolUse events with file contents
- 💬 SendMessage events (agents reporting to lead)
- 👥 3 × SubagentStop events with full transcripts

**Duration:** ~30-60 seconds | **Cost:** Very low (3 Haiku + 1 Sonnet)

#### More Test Scenarios

See `TEST_PROMPTS.md` for additional ready-to-use prompts:
- Research & Report (2 agents, read-only)
- Parallel Analysis with Tasks (task lifecycle)
- Single Agent Research (minimal test)
- And more!

#### Filter and Explore

In the dashboard:
- **Filter by agent**: Use the "Source Apps" filter to show only "test-project"
- **Filter by event type**: Toggle specific event types on/off
- **View transcripts**: Click Stop/SubagentStop events to see full chat transcripts
- **Inspect tool calls**: Click PreToolUse/PostToolUse events to see tool inputs/outputs

## 🧪 Expected Events

| When You... | You'll See... |
|-------------|---------------|
| Open Claude Code | 🚀 SessionStart |
| Send a prompt | 💬 UserPromptSubmit |
| Claude reads a file | 🔧 PreToolUse (Read) → ✅ PostToolUse |
| Claude edits a file | 🔧 PreToolUse (Edit) → ✅ PostToolUse |
| Claude runs a command | 🔧 PreToolUse (Bash) → ✅ PostToolUse |
| Response completes | 🛑 Stop (with transcript) |
| Spawn a subagent | 🟢 SubagentStart |
| Subagent finishes | 👥 SubagentStop (with transcript) |
| Exit Claude Code | 🏁 SessionEnd |

## 📊 Multi-Agent Visualization

When using agent teams, the dashboard will show:
- **Swim lanes** for each agent (color-coded)
- **Parallel execution** when multiple agents work simultaneously
- **Task handoffs** via SendMessage/TaskUpdate events
- **Live pulse chart** showing activity density across agents

## 🐛 Troubleshooting

### No events appearing?

1. Check server status:
   ```bash
   curl http://localhost:47200/health
   ```

2. Check if hooks are configured:
   ```bash
   cat .claude/settings.local.json
   ```

3. Verify MongoDB is running:
   ```bash
   docker ps | grep mongo
   ```

### Events not updating in real-time?

- Refresh the dashboard browser tab
- Check browser console for WebSocket connection errors
- Ensure no firewall is blocking port 47200/47201

## 🎯 Success Criteria

You'll know everything is working when:
- ✅ SessionStart appears immediately when opening Claude Code
- ✅ Every prompt shows UserPromptSubmit event
- ✅ Tool calls show PreToolUse → PostToolUse pairs
- ✅ Multi-agent tasks show SubagentStart/Stop events
- ✅ Timeline updates in real-time without page refresh
- ✅ Filters work correctly
- ✅ Transcripts are viewable in event details

## 📝 Sample Test Session

Here's a complete test sequence:

```bash
# Terminal 1: Open Claude Code (auto-starts everything!)
cd /Users/stevensecreti/VSCode\ Projects/claude-code-hooks-multi-agent-observability/test-project
claude

# Terminal 2: Open dashboard in browser
open http://localhost:47201

# In Claude Code prompt:
# 1. "Read calculator.ts"
# 2. "Add a multiply and divide function"
# 3. "Write comprehensive tests for all functions"
# 4. "Run npm test to verify"

# Watch the dashboard update in real-time!
```

**Note:** If you ever need to manually start/stop the system:
```bash
cd /Users/stevensecreti/VSCode\ Projects/claude-code-hooks-multi-agent-observability
just start  # Manual start
just stop   # Manual stop
```

## 🎓 Learning Objectives

After completing this test, you should understand:
- How hook events flow from Claude Code → HTTP → MongoDB → WebSocket → Dashboard
- How to filter and inspect individual agent behavior
- How multi-agent orchestration looks in the timeline
- How to troubleshoot missing or delayed events
