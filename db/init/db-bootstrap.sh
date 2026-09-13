#!/usr/bin/env bash
set -euo pipefail

if [ -n "${DATABASE_URL:-}" ]; then
  echo "🟡 Waiting for Postgres via DATABASE_URL..."

  until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
    sleep 2
  done

  PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1)
else
  echo "🟡 Waiting for Postgres at $PGHOST..."

  until pg_isready -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
    sleep 2
  done

  PSQL=(
    psql
    -h "$PGHOST"
    -U "$PGUSER"
    -d "$PGDATABASE"
    -v ON_ERROR_STOP=1
  )
fi

echo "✅ Postgres is ready."

echo "🧩 Ensuring migrations table exists..."
"${PSQL[@]}" <<'SQL'
CREATE TABLE IF NOT EXISTS public.migrations (
  version text PRIMARY KEY,
  applied_at timestamptz DEFAULT now()
);
SQL

echo "🚀 Applying new migrations..."
for file in $(ls /scripts/migrations/*.sql | sort); do
  base=$(basename "$file")
  version="${base%.sql}"

  exists=$(
    "${PSQL[@]}" -tA \
      -c "SELECT 1 FROM public.migrations WHERE version = '$version' LIMIT 1"
  )

  if [ "$exists" = "1" ]; then
    echo "⏭️  Skipping $base (already applied)"
  else
    echo "🟢 Running $base ..."

    "${PSQL[@]}" -f "$file"

    "${PSQL[@]}" \
      -c "INSERT INTO public.migrations(version) VALUES ('$version');"
  fi
done

echo "✅ All migrations done."
echo "✅ Bootstrap complete."
