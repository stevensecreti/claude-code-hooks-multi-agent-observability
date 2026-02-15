# Setup Observability Hooks

Paste this prompt into Claude Code in another project to add observability hooks.

---

## Prompt

I want to add multi-agent observability hooks to this project. The observability system lives at:

```
OBSERVABILITY_REPO=/path/to/claude-code-hooks-multi-agent-observability
```

Please do the following:

1. **Verify the repo exists** at the path above (check for `.claude/hooks/send_event.py`)

2. **Generate hooks config** for all 12 Claude Code event types using absolute paths to `send_event.py` in the observability repo. Use `--source-app` set to this project's directory name (lowercase, hyphens). Use `--server-url http://localhost:47200/events`. Add `--add-chat` for Stop and SubagentStop events.

3. **Write to `.claude/settings.local.json`** in this project (gitignored by Claude Code — keeps absolute paths out of version control). If the file already exists, merge the hooks without overwriting other settings.

4. **Test connectivity** by curling the server health endpoint:
   ```bash
   curl -sf http://localhost:47200/health
   ```

The hook command pattern for each event type is:
```
uv run /absolute/path/to/send_event.py --source-app <project-name> --event-type <EventType> --server-url http://localhost:47200/events
```

Events that need `--add-chat`: Stop, SubagentStop
Events that need `"matcher": ""`: PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, SubagentStart

---

## Alternative: Shell Script

Or run the setup script directly:

```bash
/path/to/claude-code-hooks-multi-agent-observability/scripts/setup.sh /path/to/your/project
```
