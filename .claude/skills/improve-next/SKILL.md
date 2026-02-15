---
name: improve-next
description: Picks the next pending fork improvement from PENDING_FORK_IMPROVEMENTS.md, interviews the user about ambiguities, plans the implementation with a Sonnet 4.5 agent team, implements it, validates, commits, and moves the completed item to FORK_IMPROVEMENTS.md. Use when user says "improve-next", "next improvement", or "implement next pending improvement".
---

# Improve Next

Implements the next queued improvement from `PENDING_FORK_IMPROVEMENTS.md` using a structured workflow: interview, plan, implement with an agent team, validate, commit, and archive.

## Instructions

### Step 1: Read the Queue

Read `PENDING_FORK_IMPROVEMENTS.md` at the repo root. The first `## ` heading is the next improvement to implement.

Extract:
- **Title**: The `## ` heading text
- **Description**: All content under that heading until the next `## ` heading or EOF
- Save the full extracted block — you will need it for the plan and for archiving later

If the file is empty or has no `## ` headings, tell the user there are no pending improvements and stop.

### Step 2: Interview the User

Present the improvement title and scope to the user. Then ask about any ambiguities using the `AskUserQuestion` tool.

Common ambiguities to probe:
- Technology choices not fully specified (e.g., "Mongoose vs native mongodb driver")
- Scope boundaries (e.g., "should we also migrate X while we're at it?")
- Breaking change tolerance
- Testing requirements
- Any user preferences not captured in the pending doc

If the improvement description is already unambiguous, confirm the scope with the user and move on. Do not over-interview — 1-3 questions max.

### Step 3: Analyze the Codebase

Before planning, read the key files that the improvement will touch. At minimum:
- `CLAUDE.md` — project conventions and key file references
- `FORK_IMPROVEMENTS.md` — what has already been done
- The specific source files mentioned in the improvement's scope
- `justfile`, `scripts/ensure-running.sh`, `scripts/setup.sh` if the improvement touches infrastructure
- `apps/server/src/` files if the improvement touches the backend
- `apps/client/src/` files if the improvement touches the frontend
- `apps/client/eslint.config.js` if new code will be linted
- `docker-compose.yml` if it exists

### Step 4: Enter Plan Mode

Use `EnterPlanMode` to create the implementation plan. The plan must be structured for handoff to an agent that will only have the plan in context (no conversation history).

#### Plan Structure Requirements

The plan file MUST include these sections in order:

```markdown
# [Improvement Title]

## Background Context

[Full project description — what the repo is, how it works, key architectural
decisions. Include the content from CLAUDE.md relevant to the improvement.
This section exists because the implementing agent starts with a clean context
and needs full orientation.]

## Current State

[Describe the current state of the files/systems being changed.
Include relevant code snippets, file paths, and dependency versions.]

## Goal

[What the improvement achieves. Paste the original description from
PENDING_FORK_IMPROVEMENTS.md here.]

## User Decisions

[Any answers from the interview in Step 2 that affect implementation.]

## Implementation Plan

### Task 1: [Title]
**Files:** [list of files to create/modify]
**Description:** [what this task does, detailed enough for a worker agent]
**Acceptance criteria:** [how to verify this task is done]

### Task 2: [Title]
...

### Task N: [Title]
...

## Task Dependencies

[Which tasks block which. E.g., "Task 2 is blocked by Task 1"]

## Team Structure

- **Team lead**: Coordinates workers, validates output, resolves conflicts
- **Worker 1**: [Task assignment]
- **Worker 2**: [Task assignment]
- ...

Workers should be Sonnet 4.5 (`model: "sonnet"`) agents of type `builder`.
Parallelize independent tasks. Use `validator` agents for read-only verification.

## Validation Checklist

- [ ] `pnpm install` succeeds (if client dependencies changed)
- [ ] `pnpm run build` succeeds in `apps/client/`
- [ ] `pnpm run lint` passes in `apps/client/`
- [ ] Server starts without errors (`bun run dev` in `apps/server/`)
- [ ] WebSocket connection established between client and server
- [ ] [Improvement-specific checks]

## Commit Strategy

[How to commit — single commit or multiple. Include suggested commit message(s).]

## Post-Implementation

After all tasks pass validation:
1. Commit all changes
2. Remove the completed improvement section from `PENDING_FORK_IMPROVEMENTS.md`
3. Add a summary section to `FORK_IMPROVEMENTS.md` documenting what was done
```

#### Plan Quality Checklist

Before exiting plan mode, verify:
- Every file path mentioned is absolute or repo-relative and accurate
- No task references tools, hooks, or patterns that don't exist in this codebase
- The Background Context section is thorough enough for a fresh agent to orient
- Task descriptions include the actual code changes, not just "update X"
- Acceptance criteria are concrete and testable

### Step 5: Implement

After the user approves the plan (via `ExitPlanMode`), the plan will be executed under the **clear context and auto-accept edits** path. This means:

1. **Create the team** using `TeamCreate`
2. **Create tasks** from the plan using `TaskCreate` with proper `addBlockedBy` dependencies
3. **Spawn Sonnet 4.5 builder agents** using `Task` with `subagent_type: "builder"`, `model: "sonnet"`, and `team_name` set to the team
4. **Assign tasks** to workers via `TaskUpdate` with `owner`
5. **Monitor progress** — validate each worker's output as tasks complete
6. **Resolve conflicts** — if workers produce conflicting changes, coordinate fixes
7. **Run validation checklist** — all items must pass before proceeding

### Step 6: Validate

Run the full validation checklist from the plan. At minimum:
- Build passes
- Lint passes
- Server starts
- No TypeScript errors

If any check fails, fix the issue before proceeding.

### Step 7: Commit

Commit all changes with a descriptive message following the repo's commit style. Push if the user has previously authorized pushing.

### Step 8: Archive the Improvement

1. **Remove** the completed improvement's `## ` section (heading + all content until next `## ` or EOF) from `PENDING_FORK_IMPROVEMENTS.md`
2. **Append** a new `## ` section to `FORK_IMPROVEMENTS.md` summarizing what was done — concise, no fluff, same style as existing entries

### Step 9: Commit the Archive Update

Commit the doc changes separately:
```
Move completed improvement to FORK_IMPROVEMENTS.md
```

## Examples

### Example 1: Database Migration

User runs `/improve-next`. The first item in `PENDING_FORK_IMPROVEMENTS.md` is:

```
## Database: SQLite → MongoDB (Docker)
...scope details...
```

**Interview:** "The scope mentions Mongoose or native mongodb driver — which do you prefer?" → User picks native driver.

**Plan:** Creates tasks for docker-compose, db.ts rewrite, index creation, ensure-running.sh update, chart-data endpoint. Tasks 2-5 are blocked by task 1 (docker-compose). Workers 1-3 are Sonnet 4.5 builders.

**Implementation:** Team lead spawns workers, monitors, validates build + server start + WS connection.

**Archive:** Removes the MongoDB section from pending doc, adds summary to fork improvements doc.

### Example 2: Infrastructure Change

First item is:

```
## Server: Bun → pnpm
...scope details...
```

**Interview:** "This also mentions replacing bun:sqlite — should we defer that to the MongoDB migration?" → User says yes, defer it.

**Plan:** Narrower scope — just justfile, ensure-running.sh, setup.sh, CLAUDE.md updates, bun.lock removal, pnpm-lock generation. Single worker sufficient.

**Implementation:** One builder agent handles all changes. Validator confirms server starts with pnpm-installed deps.

**Archive:** Updates both docs.
