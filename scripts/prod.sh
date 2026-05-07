#!/usr/bin/env bash
# scripts/prod.sh — production deployment.
#
# Drives a full release in stages: typecheck → build → test → docker
# build → docker push → migrations → rollout → smoke. Each stage is
# also runnable standalone so on-call can re-execute just the failed
# step. Configured entirely through environment variables — never hard-
# codes a registry, cluster, or webhook.
#
# Usage:  bash scripts/prod.sh <command>

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Optional .env.prod for local convenience; CI sets these as repo secrets.
# Parse line-by-line so placeholder tokens (`<...>`) don't break bash.
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
load_env_file "$ROOT/.env.prod"

# ---------------------------------------------------------------------------
#  Required env (fail fast with a clear message when missing).
# ---------------------------------------------------------------------------
require_env() {
  local var="$1" hint="${2:-}"
  if [ -z "${!var:-}" ]; then
    printf '\033[0;31m[err]\033[0m Required env var "%s" is not set.\n' "$var" >&2
    [ -n "$hint" ] && printf '       %s\n' "$hint" >&2
    exit 1
  fi
}

# ---------------------------------------------------------------------------
#  Output helpers.
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; NC=''
fi
log()   { printf '%b[prod]%b %s\n' "$BLUE" "$NC" "$*"; }
ok()    { printf '%b[ok ]%b %s\n' "$GREEN" "$NC" "$*"; }
warn()  { printf '%b[warn]%b %s\n' "$YELLOW" "$NC" "$*"; }
error() { printf '%b[err ]%b %s\n' "$RED" "$NC" "$*" >&2; }

# Same service list as dev.sh — single source of truth lives in the
# release manifest below; if you add a service edit BOTH scripts.
SERVICES=(
  user-service
  lead-service
  property-service
  crm-service
  notification-service
  media-service
)
BFFS=(web-bff)
APPS=(web-public admin-cockpit)

# Auto-derived: short SHA of the current commit. Override DEPLOY_TAG to
# pin a different tag (e.g. release branch tag, or :latest for emergency
# rollbacks).
DEPLOY_TAG="${DEPLOY_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"

# ---------------------------------------------------------------------------
#  Stage: precheck — confirm we're on a clean main checkout.
# ---------------------------------------------------------------------------
cmd_precheck() {
  log "Pre-flight checks…"

  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    error "Working tree has uncommitted changes. Commit or stash before deploying."
    git status --short
    return 1
  fi
  ok "Working tree clean."

  local branch
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
  if [ "$branch" != "${DEPLOY_BRANCH:-main}" ]; then
    warn "On branch '$branch' (expected '${DEPLOY_BRANCH:-main}'). Set DEPLOY_BRANCH to override."
  else
    ok "On branch '$branch'."
  fi

  local upstream
  upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo none)
  if [ "$upstream" != none ]; then
    git fetch --quiet
    local local_sha remote_sha
    local_sha=$(git rev-parse HEAD)
    remote_sha=$(git rev-parse "@{u}")
    if [ "$local_sha" != "$remote_sha" ]; then
      error "Local HEAD differs from upstream. Pull/push before deploying."
      return 1
    fi
    ok "Up-to-date with upstream."
  fi

  ok "Tag for this deploy: $DEPLOY_TAG"
}

# ---------------------------------------------------------------------------
#  Stage: build — typecheck, lint, build, test the workspace.
#  Skipped automatically when SKIP_BUILD=1 (e.g. CI already validated).
# ---------------------------------------------------------------------------
cmd_build() {
  if [ "${SKIP_BUILD:-0}" = "1" ]; then
    warn "SKIP_BUILD=1 — skipping workspace build."
    return 0
  fi
  log "Workspace build (typecheck → lint → build → test)…"
  pnpm install --frozen-lockfile
  pnpm typecheck
  pnpm lint
  pnpm build
  pnpm test
  ok "Workspace build green."
}

# ---------------------------------------------------------------------------
#  Stage: image — docker build for every service. Tags both DEPLOY_TAG and
#  :latest so ArgoCD / Helm consumers that pin :latest auto-pick-up.
# ---------------------------------------------------------------------------
cmd_image() {
  require_env DEPLOY_REGISTRY 'e.g. ghcr.io/your-org/realty-platform'
  log "Building Docker images @ tag $DEPLOY_TAG…"
  for name in "${SERVICES[@]}"; do
    local dockerfile="infra/docker/$name.Dockerfile"
    if [ ! -f "$dockerfile" ]; then
      warn "$dockerfile missing — skipping $name."
      continue
    fi
    log "  → $name"
    docker build \
      --build-arg "GIT_SHA=$(git rev-parse HEAD)" \
      -t "$DEPLOY_REGISTRY/$name:$DEPLOY_TAG" \
      -t "$DEPLOY_REGISTRY/$name:latest" \
      -f "$dockerfile" \
      .
  done
  ok "All images built."
}

# ---------------------------------------------------------------------------
#  Stage: push — push every service image to the registry.
# ---------------------------------------------------------------------------
cmd_push() {
  require_env DEPLOY_REGISTRY 'e.g. ghcr.io/your-org/realty-platform'
  log "Pushing Docker images to $DEPLOY_REGISTRY…"
  for name in "${SERVICES[@]}"; do
    if ! docker image inspect "$DEPLOY_REGISTRY/$name:$DEPLOY_TAG" >/dev/null 2>&1; then
      warn "$name:$DEPLOY_TAG not built locally — run 'image' first."
      continue
    fi
    log "  → $name:$DEPLOY_TAG"
    docker push "$DEPLOY_REGISTRY/$name:$DEPLOY_TAG"
    docker push "$DEPLOY_REGISTRY/$name:latest"
  done
  ok "All images pushed."
}

# ---------------------------------------------------------------------------
#  Stage: migrate — run schema migrations against the prod cluster. We
#  use turbo so each service runs its own migration in parallel; each
#  service's bootstrap.ts is idempotent (CREATE … IF NOT EXISTS) so a
#  re-run is safe.
# ---------------------------------------------------------------------------
cmd_migrate() {
  require_env DATABASE_URL 'production Postgres connection string'
  log "Running idempotent schema bootstrap against $(echo "$DATABASE_URL" | sed 's|//.*@|//***@|')…"
  pnpm db:migrate
  ok "Migrations applied."
}

# ---------------------------------------------------------------------------
#  Stage: deploy — trigger the rollout. Two paths:
#    1. DEPLOY_WEBHOOK_URL set → POST {sha,tag} to the webhook (ArgoCD,
#       Render, Fly, custom CD). The webhook owns the actual rollout.
#    2. KUBECTL_CONTEXT set → run an in-cluster rolling restart via
#       kubectl. Each service's Deployment must already pull
#       <registry>/<name>:latest with imagePullPolicy:Always.
# ---------------------------------------------------------------------------
cmd_deploy() {
  if [ -n "${DEPLOY_WEBHOOK_URL:-}" ]; then
    log "Triggering deploy webhook…"
    local sha
    sha=$(git rev-parse HEAD)
    curl -sSf -X POST "$DEPLOY_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      --data "{\"sha\":\"$sha\",\"tag\":\"$DEPLOY_TAG\",\"actor\":\"$(whoami)\"}"
    ok "Webhook accepted."
    return 0
  fi

  if [ -n "${KUBECTL_CONTEXT:-}" ]; then
    require_env KUBE_NAMESPACE 'k8s namespace, e.g. kiana-prod'
    log "kubectl rollout restart on context=$KUBECTL_CONTEXT ns=$KUBE_NAMESPACE…"
    for name in "${SERVICES[@]}"; do
      kubectl --context "$KUBECTL_CONTEXT" -n "$KUBE_NAMESPACE" \
        rollout restart "deployment/$name"
    done
    log "Waiting for rollouts to finish…"
    for name in "${SERVICES[@]}"; do
      kubectl --context "$KUBECTL_CONTEXT" -n "$KUBE_NAMESPACE" \
        rollout status "deployment/$name" --timeout=300s
    done
    ok "All deployments rolled."
    return 0
  fi

  error "Neither DEPLOY_WEBHOOK_URL nor KUBECTL_CONTEXT is set — cannot trigger rollout."
  error "Pick a strategy and re-run, or invoke 'image' + 'push' only and let your CD pull."
  return 1
}

# ---------------------------------------------------------------------------
#  Stage: smoke — probe each service's /health/ready post-deploy.
# ---------------------------------------------------------------------------
cmd_smoke() {
  require_env PROD_BASE_URL 'e.g. https://api.kiana.example.com'
  log "Smoke-testing $PROD_BASE_URL…"
  local failed=0
  for name in "${SERVICES[@]}" "${BFFS[@]}"; do
    local url="$PROD_BASE_URL/$name/health/ready"
    local status
    status=$(curl -s -o /dev/null -w '%{http_code}' "$url" || echo 000)
    if [ "$status" = "200" ]; then
      ok "$name → 200"
    else
      error "$name → $status (url: $url)"
      failed=$((failed + 1))
    fi
  done
  if [ "$failed" -gt 0 ]; then
    error "$failed service(s) failed smoke test."
    return 1
  fi
  ok "All services healthy."
}

# ---------------------------------------------------------------------------
#  Stage: rollback — re-tag a previous DEPLOY_TAG as :latest and re-push.
# ---------------------------------------------------------------------------
cmd_rollback() {
  require_env DEPLOY_REGISTRY 'e.g. ghcr.io/your-org/realty-platform'
  require_env ROLLBACK_TAG 'short SHA of the previous good release'
  log "Rolling back to tag '$ROLLBACK_TAG'…"
  for name in "${SERVICES[@]}"; do
    docker pull "$DEPLOY_REGISTRY/$name:$ROLLBACK_TAG"
    docker tag "$DEPLOY_REGISTRY/$name:$ROLLBACK_TAG" "$DEPLOY_REGISTRY/$name:latest"
    docker push "$DEPLOY_REGISTRY/$name:latest"
  done
  DEPLOY_TAG="$ROLLBACK_TAG" cmd_deploy
  ok "Rollback complete."
}

# ---------------------------------------------------------------------------
#  Composite: full release.
# ---------------------------------------------------------------------------
cmd_release() {
  cmd_precheck
  cmd_build
  cmd_image
  cmd_push
  cmd_migrate
  cmd_deploy
  cmd_smoke
  ok "Release of $DEPLOY_TAG complete."
}

cmd_status() {
  require_env PROD_BASE_URL 'e.g. https://api.kiana.example.com'
  cmd_smoke
}

cmd_help() {
  cat <<EOF
Usage: bash scripts/prod.sh <command>

Stages (each runnable standalone for re-trying after a failure):
  precheck   Verify clean working tree + on the right branch + in sync with remote.
  build      pnpm install / typecheck / lint / build / test (skip with SKIP_BUILD=1).
  image      docker build all service images, tagged with \$DEPLOY_TAG (default: short SHA).
  push       docker push all service images to \$DEPLOY_REGISTRY.
  migrate    Run idempotent schema bootstrap against \$DATABASE_URL.
  deploy     Trigger rollout via either \$DEPLOY_WEBHOOK_URL OR \$KUBECTL_CONTEXT.
  smoke      Probe \$PROD_BASE_URL/<service>/health/ready for every service.
  rollback   Re-tag \$ROLLBACK_TAG as :latest and re-trigger deploy.

Composites:
  release    precheck → build → image → push → migrate → deploy → smoke.
  status     Same as smoke.

Required env (fail fast):
  DEPLOY_REGISTRY     image registry, e.g. ghcr.io/your-org/realty-platform
  DEPLOY_TAG          override the auto-derived short-SHA tag (optional)
  DEPLOY_BRANCH       expected branch (default: main)
  DATABASE_URL        prod Postgres URL (only used for 'migrate')
  PROD_BASE_URL       e.g. https://api.kiana.example.com (used by 'smoke')

Pick ONE rollout strategy:
  DEPLOY_WEBHOOK_URL  POSTed {sha,tag,actor} to trigger ArgoCD / Render / etc.
  KUBECTL_CONTEXT     k8s context to 'kubectl rollout restart' against.
  KUBE_NAMESPACE      k8s namespace (required when KUBECTL_CONTEXT is set).

Toggles:
  SKIP_BUILD=1        skip workspace build (e.g. CI already ran it).
EOF
}

CMD="${1:-help}"
shift || true
case "$CMD" in
  precheck) cmd_precheck "$@" ;;
  build)    cmd_build    "$@" ;;
  image)    cmd_image    "$@" ;;
  push)     cmd_push     "$@" ;;
  migrate)  cmd_migrate  "$@" ;;
  deploy)   cmd_deploy   "$@" ;;
  smoke)    cmd_smoke    "$@" ;;
  rollback) cmd_rollback "$@" ;;
  release)  cmd_release  "$@" ;;
  status)   cmd_status   "$@" ;;
  help|-h|--help) cmd_help ;;
  *)        error "Unknown command: $CMD"; cmd_help; exit 1 ;;
esac
