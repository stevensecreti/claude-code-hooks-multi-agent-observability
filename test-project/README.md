# Test Project for Multi-Agent Observability

This is a sample project to test the Claude Code multi-agent observability system.

## Purpose

Test that hook events are properly captured and displayed in the dashboard when running Claude Code within this project.

## Setup

✅ **Already configured!** The `.claude/settings.local.json` file contains all necessary hooks.

**Auto-start enabled:** When you open Claude Code, the system automatically:
- Starts Docker MongoDB (if needed)
- Starts the server on port 47200 (if needed)
- Starts the client dashboard on port 47201 (if needed)

Just open Claude Code and start working!

## What to Test

1. **Open Claude Code** in this directory: `cd test-project && claude`
2. **The dashboard auto-starts** — open it at http://localhost:47201
3. **Use ready-made test prompts** from `TEST_PROMPTS.md`

### 🎯 Quick Test (Recommended)

Copy this prompt into Claude Code to see multi-agent coordination:

```
I need you to analyze this codebase using an agent team. Create 3 specialized agents working in parallel:

1. Code Analyst (Haiku): Read calculator.ts and analyze the implementations
2. Test Reviewer (Haiku): Read calculator.test.ts and evaluate test coverage
3. Documentation Auditor (Sonnet): Read package.json, tsconfig.json, vitest.config.ts

Each agent should only READ files (no writes). Report findings back.
```

**See `TEST_PROMPTS.md` for more ready-to-use test scenarios!**

## Expected Behavior

You should see events streaming into the dashboard in real-time:
- 🚀 SessionStart when Claude Code starts
- 💬 UserPromptSubmit for each prompt you send
- 🔧 PreToolUse / ✅ PostToolUse for file reads, writes, edits
- 🛑 Stop events when responses complete
- 🏁 SessionEnd when you exit

## Sample Tasks to Try

### Simple Task (single session)
- "Add a divide function to calculator.ts with error handling for division by zero"

### Multi-Agent Task (agent team)
- "Create a full test suite for calculator.ts using Vitest, and add documentation comments to all functions"
  - This should spawn multiple agents working in parallel
  - You'll see SubagentStart/SubagentStop events in the timeline
