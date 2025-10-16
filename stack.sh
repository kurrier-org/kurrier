#!/usr/bin/env bash
set -euo pipefail

# Absolute paths so nothing depends on the caller's CWD
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROD="${ROOT_DIR}/docker-compose.yml"
DB="${ROOT_DIR}/db/docker-compose.yml"
ROOT_ENV="${ROOT_DIR}/.env"
DB_ENV="${ROOT_DIR}/db/.env"

cmd="${1:-up}"

compose_cmd=( docker compose )

# Load env files if they exist (order matters: DB first, then ROOT to override)
[ -f "$DB_ENV" ]   && compose_cmd+=( --env-file "$DB_ENV" )
[ -f "$ROOT_ENV" ] && compose_cmd+=( --env-file "$ROOT_ENV" )

# IMPORTANT: root compose FIRST so project dir = repo root
compose_cmd+=( -f "$PROD" -f "$DB" )

case "$cmd" in
  up)       "${compose_cmd[@]}" up -d ;;
  down)     "${compose_cmd[@]}" down -v ;;
  logs)     "${compose_cmd[@]}" logs -f ;;
  ps)       "${compose_cmd[@]}" ps ;;
  restart)  "${compose_cmd[@]}" restart ;;
  pull)     "${compose_cmd[@]}" pull ;;
  *)
    echo "Usage: $0 {up|down|logs|ps|restart|pull}"
    exit 1 ;;
esac
