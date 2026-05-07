#!/usr/bin/env bash
# scripts/dev.sh — local dev environment manager.
#
# Owns the Node dev servers via PID files in .run/pids/ so it only ever
# stops processes IT started. Postgres + Redis + ProjexLight MCP are
# probed first — if they're already reachable (e.g. from an earlier
# session, a Windows-installed Postgres, or another dev environment)
# this script reuses them. Otherwise it starts the docker-compose
# infra. Data volumes are never wiped.
#
# Usage:  bash scripts/dev.sh <start|stop|restart|status|logs|nuke|help>

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RUN_DIR="$ROOT/.run"
LOG_DIR="$RUN_DIR/logs"
PID_DIR="$RUN_DIR/pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

# Load .env if present. Parse line-by-line instead of `source`-ing because
# .env contains placeholder tokens like `<will_be_decrypted>` that Node's
# dotenv handles fine but bash treats as input redirection. Each safe
# `KEY=VALUE` pair is exported; everything else is silently skipped.
load_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  local line key value
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in ''|\#*) continue ;; esac
    if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi
      export "$key=$value"
    fi
  done < "$file"
}
load_env_file "$ROOT/.env"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-kiana_realty_growth_platform_db}"
DB_USER="${DB_USER:-postgres}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
MCP_PORT="${MCP_SERVER_PORT:-8766}"

# name:port:dir pairs. Adding a new service? Append here and dev.sh picks
# it up — no other edits needed.
SERVICES=(
  "user-service:4010:services/user-service"
  "lead-service:4011:services/lead-service"
  "property-service:4012:services/property-service"
  "crm-service:4013:services/crm-service"
  "notification-service:4014:services/notification-service"
  "media-service:4015:services/media-service"
)
BFFS=(
  "web-bff:4000:bffs/web-bff"
)
APPS=(
  # name:port:dir:bin (bin is the local node_modules/.bin entry to spawn)
  "web-public:3000:apps/web-public:next:dev"
  "admin-cockpit:5173:apps/admin-cockpit:vite"
)

# ---------------------------------------------------------------------------
#  Output helpers (color when stdout is a tty).
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; NC=''
fi
log()   { printf '%b[dev]%b %s\n' "$BLUE" "$NC" "$*"; }
ok()    { printf '%b[ok ]%b %s\n' "$GREEN" "$NC" "$*"; }
warn()  { printf '%b[warn]%b %s\n' "$YELLOW" "$NC" "$*"; }
error() { printf '%b[err ]%b %s\n' "$RED" "$NC" "$*" >&2; }

# ---------------------------------------------------------------------------
#  Probes — return 0 when the resource is reachable, 1 otherwise.
# ---------------------------------------------------------------------------
probe_tcp() {
  local host="$1" port="$2"
  if command -v nc >/dev/null 2>&1; then
    nc -z -w 2 "$host" "$port" >/dev/null 2>&1
  else
    # /dev/tcp is a bash builtin available in Git Bash + Linux.
    (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null && return 0 || return 1
  fi
}

probe_pg()    { probe_tcp "$DB_HOST" "$DB_PORT"; }
probe_redis() { probe_tcp "$REDIS_HOST" "$REDIS_PORT"; }
probe_mcp()   { probe_tcp localhost "$MCP_PORT"; }

is_port_listening() { probe_tcp localhost "$1"; }

# Verify a still-living PID actually belongs to THIS project (not another
# app that grabbed the same port). Cross-platform: tries lsof / ps / wmic
# in that order, looks for the project root path in cwd or argv.
is_our_pid() {
  local pid="$1"
  if ! kill -0 "$pid" 2>/dev/null; then return 1; fi
  if command -v lsof >/dev/null 2>&1; then
    if lsof -p "$pid" 2>/dev/null | awk '$4=="cwd"{print $NF}' | grep -qF "$ROOT"; then
      return 0
    fi
  fi
  if command -v ps >/dev/null 2>&1; then
    if ps -p "$pid" -o args= 2>/dev/null | grep -qF "$ROOT"; then
      return 0
    fi
  fi
  if command -v wmic >/dev/null 2>&1; then
    # Windows: convert ROOT to backslash form for matching.
    local win_root
    win_root=$(echo "$ROOT" | sed 's|/|\\|g; s|\\c\\|C:\\|')
    if wmic process where "ProcessId=$pid" get CommandLine,ExecutablePath /format:list 2>/dev/null \
        | grep -qiF "${win_root//\\/\\\\}"; then
      return 0
    fi
  fi
  return 1
}

# ---------------------------------------------------------------------------
#  Process lifecycle (PID-file based — only touches what WE started).
# ---------------------------------------------------------------------------
spawn() {
  local name="$1" cwd="$2"
  shift 2
  local pidfile="$PID_DIR/$name.pid"
  local logfile="$LOG_DIR/$name.log"

  if [ -f "$pidfile" ]; then
    local existing
    existing=$(cat "$pidfile" 2>/dev/null || true)
    if [ -n "$existing" ] && kill -0 "$existing" 2>/dev/null; then
      warn "$name already running (pid $existing) — leaving it alone."
      return 0
    fi
    rm -f "$pidfile"
  fi

  log "Starting $name…"
  ( cd "$cwd" && exec "$@" ) >>"$logfile" 2>&1 &
  local pid=$!
  echo "$pid" > "$pidfile"
  ok "$name started (pid $pid → $logfile)"
}

terminate() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"
  [ -f "$pidfile" ] || return 0
  local pid
  pid=$(cat "$pidfile" 2>/dev/null || true)
  rm -f "$pidfile"
  [ -n "$pid" ] || return 0

  if ! kill -0 "$pid" 2>/dev/null; then return 0; fi
  if ! is_our_pid "$pid"; then
    warn "pid $pid is not ours — refusing to kill (likely another app reused it)."
    return 0
  fi

  log "Stopping $name (pid $pid)…"
  # Take any direct children too — tsx watch / next dev fork a child node.
  if command -v pkill >/dev/null 2>&1; then
    pkill -TERM -P "$pid" 2>/dev/null || true
  fi
  kill -TERM "$pid" 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.3
  done
  if kill -0 "$pid" 2>/dev/null; then
    warn "$name didn't stop on TERM — sending KILL."
    if command -v pkill >/dev/null 2>&1; then
      pkill -KILL -P "$pid" 2>/dev/null || true
    fi
    kill -KILL "$pid" 2>/dev/null || true
  fi
  ok "$name stopped."
}

# ---------------------------------------------------------------------------
#  Infra (Postgres + Redis + MCP) — probe first, only `docker compose up`
#  what's missing, never wipe data volumes.
# ---------------------------------------------------------------------------
ensure_infra() {
  if probe_pg; then
    ok "Postgres reachable @ $DB_HOST:$DB_PORT — reusing."
  else
    log "Postgres not reachable — starting docker-compose postgres…"
    docker compose up -d postgres
    for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
      probe_pg && break
      sleep 1
    done
    probe_pg && ok "Postgres up." || { error "Postgres failed to come up — check 'docker compose logs postgres'."; return 1; }
  fi

  if probe_redis; then
    ok "Redis reachable @ $REDIS_HOST:$REDIS_PORT — reusing."
  else
    log "Redis not reachable — starting docker-compose redis…"
    docker compose up -d redis
    for i in 1 2 3 4 5 6 7 8 9 10; do
      probe_redis && break
      sleep 1
    done
    probe_redis && ok "Redis up." || { error "Redis failed to come up."; return 1; }
  fi

  if probe_mcp; then
    ok "ProjexLight MCP reachable @ localhost:$MCP_PORT — reusing."
  else
    log "MCP server not reachable — starting docker-compose mcp-server…"
    docker compose up -d mcp-server || warn "MCP failed to start (non-fatal in dev)."
  fi
}

# ---------------------------------------------------------------------------
#  Public commands.
# ---------------------------------------------------------------------------
cmd_start() {
  log "Bringing up dev stack from $ROOT"
  ensure_infra

  for entry in "${SERVICES[@]}" "${BFFS[@]}"; do
    IFS=':' read -r name port dir <<<"$entry"
    spawn "$name" "$ROOT/$dir" "$ROOT/node_modules/.bin/tsx" watch src/index.ts
  done

  # Apps use their own local node_modules/.bin (pnpm workspace layout —
  # next / vite live next to each app, not hoisted to the workspace root).
  for entry in "${APPS[@]}"; do
    IFS=':' read -r name port dir bin extra <<<"$entry"
    local app_bin="$ROOT/$dir/node_modules/.bin/$bin"
    if [ ! -x "$app_bin" ] && [ ! -f "$app_bin" ] && [ ! -f "$app_bin.cmd" ]; then
      warn "$bin not found at $app_bin — skipping $name. Try: pnpm install"
      continue
    fi
    if [ -n "${extra:-}" ]; then
      spawn "$name" "$ROOT/$dir" "$app_bin" "$extra"
    else
      spawn "$name" "$ROOT/$dir" "$app_bin"
    fi
  done

  echo
  ok "Dev stack started."
  echo "    web-public:    http://localhost:3000"
  echo "    admin-cockpit: http://localhost:5173"
  echo "    bff:           http://localhost:4000"
  echo "    services:      4010-4015"
  echo "    Logs:          bash scripts/dev.sh logs [<name>]"
  echo "    Stop:          bash scripts/dev.sh stop"
}

cmd_stop() {
  log "Stopping dev stack (preserves DB volumes, leaves external infra alone)…"
  if [ -d "$PID_DIR" ]; then
    for f in "$PID_DIR"/*.pid; do
      [ -e "$f" ] || continue
      terminate "$(basename "$f" .pid)"
    done
  fi
  ok "All tracked processes stopped."
}

cmd_restart() { cmd_stop; sleep 1; cmd_start; }

cmd_status() {
  printf '\n%-22s %-8s %-10s %s\n' NAME PORT STATE PID
  printf '%-22s %-8s %-10s %s\n' ---- ---- ----- ---
  local total=("${SERVICES[@]}" "${BFFS[@]}" "${APPS[@]}")
  for entry in "${total[@]}"; do
    local name port pid state
    name="${entry%%:*}"
    rest="${entry#*:}"
    port="${rest%%:*}"
    state="DOWN"
    pid="-"
    local pidfile="$PID_DIR/$name.pid"
    if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      state="UP"
      pid="$(cat "$pidfile")"
    elif is_port_listening "$port"; then
      state="EXTERNAL"
    fi
    printf '%-22s %-8s %-10s %s\n' "$name" "$port" "$state" "$pid"
  done
  echo
  probe_pg    && ok "Postgres @ $DB_HOST:$DB_PORT"     || warn "Postgres NOT reachable @ $DB_HOST:$DB_PORT"
  probe_redis && ok "Redis    @ $REDIS_HOST:$REDIS_PORT" || warn "Redis NOT reachable @ $REDIS_HOST:$REDIS_PORT"
  probe_mcp   && ok "MCP      @ localhost:$MCP_PORT"   || warn "MCP NOT reachable @ localhost:$MCP_PORT"
  echo
}

cmd_logs() {
  local target="${1:-}"
  if [ -z "$target" ]; then
    if ! ls "$LOG_DIR"/*.log >/dev/null 2>&1; then
      warn "No logs yet. Run: bash scripts/dev.sh start"
      return 0
    fi
    log "Tailing all dev logs (Ctrl+C to detach — services keep running)…"
    tail -F "$LOG_DIR"/*.log
  else
    local f="$LOG_DIR/$target.log"
    [ -f "$f" ] || { error "No log for '$target'. Available: $(ls "$LOG_DIR" | sed 's/\.log$//' | tr '\n' ' ')"; return 1; }
    tail -F "$f"
  fi
}

# `nuke` is the escape hatch — kills any orphan node listener on a dev
# port whose process command-line points at THIS project root. Useful
# when a previous run died without writing a clean pid file. Will NOT
# touch processes from other apps even if they share a port.
cmd_nuke() {
  log "Scanning dev ports for stale listeners owned by this project…"
  local total=("${SERVICES[@]}" "${BFFS[@]}" "${APPS[@]}")
  for entry in "${total[@]}"; do
    local rest port
    rest="${entry#*:}"
    port="${rest%%:*}"
    is_port_listening "$port" || continue
    local pid=""
    if command -v lsof >/dev/null 2>&1; then
      pid=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1)
    elif command -v ss >/dev/null 2>&1; then
      pid=$(ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $0}' | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
    elif command -v netstat >/dev/null 2>&1; then
      pid=$(netstat -ano 2>/dev/null | awk -v p=":$port " '$2 ~ p && /LISTEN/ {print $NF}' | head -1)
    fi
    [ -n "$pid" ] || continue
    if is_our_pid "$pid"; then
      log "Port $port pid $pid is ours — terminating."
      kill -TERM "$pid" 2>/dev/null || true
      sleep 1
      kill -KILL "$pid" 2>/dev/null || true
    else
      warn "Port $port is held by pid $pid which is NOT this project — leaving it alone."
    fi
  done
  rm -f "$PID_DIR"/*.pid
  ok "Nuke pass complete."
}

cmd_help() {
  cat <<EOF
Usage: bash scripts/dev.sh <command>

Commands:
  start     Bring up Postgres + Redis + MCP (only if not already running) and
            every Node dev server. Reuses an existing database — never wipes
            volumes.
  stop      Stop only the processes this script started (PID-file tracked).
            Leaves Postgres + Redis + MCP running so other tools can keep
            using them.
  restart   stop && start.
  status    Show per-process state + infra reachability.
  logs [n]  Tail logs (all if no name; one service if name given).
  nuke      Kill any orphan dev-port listener whose process belongs to this
            project. Will not touch processes from other apps that happen to
            share a port.
  help      This message.
EOF
}

# ---------------------------------------------------------------------------
#  Dispatch.
# ---------------------------------------------------------------------------
CMD="${1:-help}"
shift || true
case "$CMD" in
  start)   cmd_start   "$@" ;;
  stop)    cmd_stop    "$@" ;;
  restart) cmd_restart "$@" ;;
  status)  cmd_status  "$@" ;;
  logs)    cmd_logs    "$@" ;;
  nuke)    cmd_nuke    "$@" ;;
  help|-h|--help) cmd_help ;;
  *)       error "Unknown command: $CMD"; cmd_help; exit 1 ;;
esac
