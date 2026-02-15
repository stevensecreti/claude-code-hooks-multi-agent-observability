#!/bin/bash
set -euo pipefail

# ─── Setup Observability Hooks for Any Project ─────────────────────
# Generates hooks config using absolute paths back to this repo.
# No files are copied to the target project.
#
# Usage: ./scripts/setup.sh /path/to/your/project [--source-app custom-name]

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# ─── Args ───────────────────────────────────────────────────────────
TARGET_DIR="${1:?Usage: ./scripts/setup.sh /path/to/your/project [--source-app name]}"
shift

# Resolve absolute paths
TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd)" || {
    echo -e "${RED}Error: Target directory does not exist: $1${NC}" >&2
    exit 1
}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
SEND_EVENT="$REPO_ROOT/.claude/hooks/send_event.py"
ENSURE_RUNNING="$REPO_ROOT/scripts/ensure-running.sh"

if [ ! -f "$SEND_EVENT" ]; then
    echo -e "${RED}Error: send_event.py not found at $SEND_EVENT${NC}" >&2
    exit 1
fi

# Parse optional --source-app
SOURCE_APP=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --source-app) SOURCE_APP="$2"; shift 2 ;;
        *) echo -e "${RED}Unknown option: $1${NC}" >&2; exit 1 ;;
    esac
done

# Default source-app: sanitized basename of target directory
if [ -z "$SOURCE_APP" ]; then
    SOURCE_APP="$(basename "$TARGET_DIR" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')"
fi

SERVER_PORT="${SERVER_PORT:-47200}"

echo -e "${BLUE}Setting up observability hooks${NC}"
echo -e "  Target:     ${GREEN}$TARGET_DIR${NC}"
echo -e "  Source app:  ${GREEN}$SOURCE_APP${NC}"
echo -e "  Server:      ${GREEN}http://localhost:$SERVER_PORT${NC}"
echo -e "  Hook script: ${GREEN}$SEND_EVENT${NC}"
echo -e "  Auto-start:  ${GREEN}$ENSURE_RUNNING${NC}"

# ─── Generate hooks JSON ────────────────────────────────────────────

# All 12 event types. Stop and SubagentStop get --add-chat for transcript capture.
EVENT_TYPES=(
    "PreToolUse"
    "PostToolUse"
    "PostToolUseFailure"
    "PermissionRequest"
    "Notification"
    "UserPromptSubmit"
    "SessionStart"
    "SessionEnd"
    "SubagentStart"
    "SubagentStop"
    "Stop"
    "PreCompact"
)

# Build hooks JSON using python3 (no jq dependency)
HOOKS_JSON=$(python3 -c "
import json

event_types = $(printf '%s\n' "${EVENT_TYPES[@]}" | python3 -c "import sys,json; print(json.dumps([l.strip() for l in sys.stdin]))")
send_event = '$SEND_EVENT'
ensure_running = '$ENSURE_RUNNING'
source_app = '$SOURCE_APP'
server_url = 'http://localhost:$SERVER_PORT/events'
add_chat_events = {'Stop', 'SubagentStop'}

hooks = {}
for et in event_types:
    cmd = f'uv run \"{send_event}\" --source-app {source_app} --event-type {et} --server-url {server_url}'
    if et in add_chat_events:
        cmd += ' --add-chat'

    hook_list = []

    # SessionStart gets ensure-running as first hook (auto-starts server if needed)
    if et == 'SessionStart':
        hook_list.append({'type': 'command', 'command': f'\"{ensure_running}\"'})

    hook_list.append({'type': 'command', 'command': cmd})

    entry = {
        'hooks': hook_list
    }
    # Add empty matcher for tool-related events
    if et in ('PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest', 'SubagentStart'):
        entry['matcher'] = ''

    hooks[et] = [entry]

print(json.dumps({'hooks': hooks}, indent=2))
")

# ─── Write to settings.local.json (gitignored by Claude Code) ──────

SETTINGS_DIR="$TARGET_DIR/.claude"
SETTINGS_FILE="$SETTINGS_DIR/settings.local.json"

mkdir -p "$SETTINGS_DIR"

# Write new hooks to a temp file (avoids shell quoting issues in merge)
HOOKS_TMPFILE=$(mktemp)
echo "$HOOKS_JSON" > "$HOOKS_TMPFILE"

if [ -f "$SETTINGS_FILE" ]; then
    echo -e "\n${YELLOW}Merging with existing $SETTINGS_FILE${NC}"
    # Merge: new hooks override existing hooks, preserve other keys
    MERGED=$(python3 -c "
import json, sys

with open('$SETTINGS_FILE') as f:
    existing = json.load(f)

with open('$HOOKS_TMPFILE') as f:
    new_data = json.load(f)

# Merge hooks into existing
if 'hooks' not in existing:
    existing['hooks'] = {}
existing['hooks'].update(new_data['hooks'])

print(json.dumps(existing, indent=2))
")
    echo "$MERGED" > "$SETTINGS_FILE"
else
    mv "$HOOKS_TMPFILE" "$SETTINGS_FILE"
fi

rm -f "$HOOKS_TMPFILE" 2>/dev/null

echo -e "\n${GREEN}Done!${NC} Hooks written to ${BLUE}$SETTINGS_FILE${NC}"
echo -e "\n${BLUE}How it works:${NC}"
echo -e "  The observability system auto-starts when you open Claude Code."
echo -e "  SessionStart hook runs ${YELLOW}ensure-running.sh${NC} which checks if the"
echo -e "  server is up and starts it in the background if not."
echo -e "\n${BLUE}To use:${NC}"
echo -e "  1. Open Claude Code in:  ${YELLOW}$TARGET_DIR${NC}"
echo -e "  2. View dashboard at:    ${YELLOW}http://localhost:${CLIENT_PORT:-47201}${NC}"
echo -e "\n${BLUE}Manual start/stop:${NC}"
echo -e "  Start:  ${YELLOW}cd $REPO_ROOT && just start${NC}"
echo -e "  Stop:   ${YELLOW}cd $REPO_ROOT && just stop${NC}"
echo -e "\nEvents will appear as ${GREEN}$SOURCE_APP${NC} in the dashboard."
