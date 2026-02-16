#!/bin/bash
# ─── Ensure Observability System is Running ─────────────────────────
# Fast health check + background auto-start if needed.
# Called from hooks (e.g. SessionStart) — must be fast and non-blocking.
#
# Exit 0 always — never block Claude Code.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

SERVER_PORT=${SERVER_PORT:-47200}
CLIENT_PORT=${CLIENT_PORT:-47201}

PIDFILE="/tmp/observability-server.pid"
LOGFILE="/tmp/observability-startup.log"

# ─── Fast health check (300ms timeout) ──────────────────────────────
if curl -sf --max-time 0.3 "http://localhost:$SERVER_PORT/health" > /dev/null 2>&1; then
    exit 0
fi

# ─── Server not running — start in background ──────────────────────
# Guard against multiple simultaneous startups (e.g. parallel hooks)
LOCKFILE="/tmp/observability-startup.lock"
if [ -f "$LOCKFILE" ]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCKFILE" 2>/dev/null || stat -c %Y "$LOCKFILE" 2>/dev/null || echo 0) ))
    if [ "$LOCK_AGE" -lt 30 ]; then
        # Another startup is in progress — wait for it
        for i in {1..10}; do
            sleep 0.5
            if curl -sf --max-time 0.3 "http://localhost:$SERVER_PORT/health" > /dev/null 2>&1; then
                exit 0
            fi
        done
        exit 0
    fi
    # Stale lock — remove it
fi
touch "$LOCKFILE"

echo "[$(date)] Starting observability system..." > "$LOGFILE"

# Ensure dependencies are installed
if [ ! -d "$REPO_ROOT/apps/server/node_modules" ]; then
    echo "[$(date)] Installing server dependencies..." >> "$LOGFILE"
    cd "$REPO_ROOT/apps/server" && pnpm install >> "$LOGFILE" 2>&1
fi
if [ ! -d "$REPO_ROOT/apps/client/node_modules" ]; then
    echo "[$(date)] Installing client dependencies..." >> "$LOGFILE"
    cd "$REPO_ROOT/apps/client" && pnpm install >> "$LOGFILE" 2>&1
fi

# Ensure MongoDB is running
cd "$REPO_ROOT"
docker compose -f "$REPO_ROOT/docker-compose.yml" up -d >> "$LOGFILE" 2>&1

# Start server
cd "$REPO_ROOT/apps/server"
SERVER_PORT=$SERVER_PORT nohup bun run dev >> "$LOGFILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PIDFILE"

# Start client (pnpm for deps, vite for dev server)
cd "$REPO_ROOT/apps/client"
VITE_PORT=$CLIENT_PORT nohup pnpm run dev >> "$LOGFILE" 2>&1 &
CLIENT_PID=$!
echo "$CLIENT_PID" >> "$PIDFILE"

echo "[$(date)] Server PID: $SERVER_PID, Client PID: $CLIENT_PID" >> "$LOGFILE"

# Wait up to 5s for server to be ready
for i in {1..10}; do
    sleep 0.5
    if curl -sf --max-time 0.3 "http://localhost:$SERVER_PORT/health" > /dev/null 2>&1; then
        echo "[$(date)] Server ready on port $SERVER_PORT" >> "$LOGFILE"
        break
    fi
done

# Clean up lock
rm -f "$LOCKFILE" 2>/dev/null

exit 0
