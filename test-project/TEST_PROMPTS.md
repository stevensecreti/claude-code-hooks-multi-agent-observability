# Test Prompts for Multi-Agent Observability

Ready-to-use prompts to test the observability dashboard with different agent team scenarios.

---

## 🎯 Recommended Test: Multi-Agent Code Analysis (Read-Only)

**Copy and paste this prompt into Claude Code:**

```
I need you to analyze this codebase using an agent team. Create 3 specialized agents working in parallel:

1. **Code Analyst (Haiku)**: Read calculator.ts and analyze the function implementations, types, and code quality
2. **Test Reviewer (Haiku)**: Read calculator.test.ts and evaluate test coverage and test quality
3. **Documentation Auditor (Sonnet)**: Read package.json, tsconfig.json, and vitest.config.ts and summarize the project setup

Each agent should:
- Only READ files (no writes or edits)
- Report their findings back to you as the team lead
- Work in parallel where possible

After all agents complete, give me a summary of what each agent found.
```

**What you'll see in the dashboard:**
- 🚀 Your SessionStart
- 💬 Your UserPromptSubmit
- 🟢 3 × SubagentStart events (one for each specialist)
- 🔧 Multiple PreToolUse (Read) events from each agent
- ✅ Multiple PostToolUse events with file contents
- 💬 SendMessage events (agents reporting to lead)
- 👥 3 × SubagentStop events (with full transcripts)
- 🛑 Your Stop event with final summary

**Duration:** ~30-60 seconds
**API Cost:** Very low (3 Haiku + 1 Sonnet for coordination)

---

## 🔬 Alternative Test: Research & Report (No Changes)

**Copy and paste this prompt:**

```
Use an agent team to research this calculator project. Spawn 2 agents in parallel:

1. **Structure Explorer (Haiku)**: Use Glob to find all TypeScript files, then read each one and describe the project structure
2. **Configuration Expert (Haiku)**: Read all config files (package.json, tsconfig.json, vitest.config.ts) and explain how the project is set up

Both agents should only use Read and Glob tools (no writes). Report back when both finish.
```

**What you'll see:**
- 🟢 2 × SubagentStart
- 🔧 Multiple Glob and Read tool calls
- 👥 2 × SubagentStop
- Clean parallel execution timeline

**Duration:** ~20-30 seconds
**API Cost:** Minimal (2 Haiku agents)

---

## 🎨 Advanced Test: Parallel Analysis with Tasks

**Copy and paste this prompt:**

```
Create a task list and agent team to analyze this calculator codebase:

Tasks:
1. Analyze calculator.ts implementation
2. Review test coverage
3. Check TypeScript configuration
4. Examine package dependencies

Spawn 3 Haiku agents in parallel. Assign tasks 1-2 to the first two agents, and tasks 3-4 to the third agent. Use TaskCreate, TaskUpdate, and SendMessage to coordinate. All agents should only READ files.

Give me a final report when all tasks are complete.
```

**What you'll see:**
- 📋 TaskCreate events for each task
- 🟢 3 × SubagentStart
- 🔧 TaskUpdate events (in_progress → completed)
- 💬 SendMessage events (inter-agent coordination)
- 👥 3 × SubagentStop
- Full task lifecycle visualization

**Duration:** ~45-60 seconds
**API Cost:** Low (3 Haiku + lead coordination)

---

## 🚦 Minimal Test: Single Agent Research

**If you just want to test basic observability without teams:**

```
Read calculator.ts and calculator.test.ts, then give me a brief summary of what the code does.
```

**What you'll see:**
- 🚀 SessionStart
- 💬 UserPromptSubmit
- 🔧 2 × PreToolUse (Read)
- ✅ 2 × PostToolUse
- 🛑 Stop

**Duration:** ~5-10 seconds
**API Cost:** Minimal (single agent, 2 file reads)

---

## 📊 What to Watch For in the Dashboard

### Timeline View
- **Swim lanes** for each agent (color-coded)
- **Parallel execution** when multiple agents work simultaneously
- **Sequential operations** within each agent

### Event Filters
- Toggle "SubagentStart" and "SubagentStop" to focus on team activity
- Filter by "test-project" source app
- Toggle "PreToolUse"/"PostToolUse" to see file operations

### Event Details
- Click **SubagentStop** events to see full agent transcripts
- Click **PreToolUse** events to see tool inputs (file paths, commands)
- Click **PostToolUse** events to see tool outputs (file contents, results)

### Live Pulse Chart
- Watch activity spikes when multiple agents execute tools
- See density of operations over time
- Correlate chart activity with timeline events

---

## 🎯 Testing Checklist

After running a multi-agent test prompt, verify:

- [ ] SessionStart appears immediately when opening Claude Code
- [ ] UserPromptSubmit shows your full prompt
- [ ] Multiple SubagentStart events appear (one per agent)
- [ ] PreToolUse/PostToolUse pairs show file reads
- [ ] SendMessage or TaskUpdate events show coordination (if applicable)
- [ ] SubagentStop events include full agent transcripts
- [ ] Stop event includes your full chat history
- [ ] Timeline shows parallel execution (overlapping events)
- [ ] Filters work (toggle event types on/off)
- [ ] Chart updates in real-time during execution

---

## 💡 Tips

1. **Start simple**: Try the "Minimal Test" first to verify basic observability
2. **Then go parallel**: Use the "Recommended Test" to see multi-agent coordination
3. **Watch in real-time**: Keep the dashboard open while running prompts
4. **Inspect transcripts**: Click SubagentStop events to see what each agent did
5. **Use filters**: Toggle event types to focus on specific behaviors

---

## 🐛 Troubleshooting

### No events appearing?
```bash
# Check server health
curl http://localhost:47200/health

# Check if hooks are configured
cat .claude/settings.local.json | grep send_event.py
```

### Dashboard not loading?
```bash
# Check if client is running
curl http://localhost:47201

# Manually restart if needed
cd /Users/stevensecreti/VSCode\ Projects/claude-code-hooks-multi-agent-observability
just restart
```

### Events delayed?
- WebSocket might have disconnected — refresh the dashboard page
- Check browser console for connection errors
- Verify MongoDB is running: `docker ps | grep mongo`

---

## 📚 More Examples

Want to try something different? Here are more scenarios:

### Documentation Generator (Read + Write)
```
Create 2 agents: one to read all source files and extract function signatures, another to write a FUNCTIONS.md file with documentation. Work in parallel where possible.
```

### Test Suite Builder (Write)
```
Spawn 3 Haiku agents to each write one test case for calculator.ts: test add(), subtract(), and a new multiply() function you'll implement. Coordinate via tasks.
```

### Code Quality Audit (Read-Only)
```
Create 4 agents to audit: (1) TypeScript types, (2) test coverage, (3) error handling, (4) code style. All read-only. Report findings.
```

Each of these will generate different event patterns in the dashboard!
