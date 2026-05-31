#!/usr/bin/env bash
set -euo pipefail

echo "🟡 Waiting for Postgres at $PGHOST..."
until pg_isready -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
  sleep 2
done
echo "✅ Postgres is ready."

echo "🧩 Ensuring migrations table exists..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.migrations (
  version text PRIMARY KEY,
  applied_at timestamptz DEFAULT now()
);
SQL


echo "🚀 Applying new migrations..."
for file in $(ls /scripts/migrations/*.sql | sort); do
  base=$(basename "$file")
  version="${base%.sql}"
  exists=$(psql -tA -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" \
    -c "SELECT 1 FROM public.migrations WHERE version = '$version' LIMIT 1")

  if [ "$exists" = "1" ]; then
    echo "⏭️  Skipping $base (already applied)"
  else
    echo "🟢 Running $base ..."
    psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$file"
    psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" \
      -c "INSERT INTO public.migrations(version) VALUES ('$version');"
  fi
done

echo "✅ All migrations done."

echo "✅ Bootstrap complete."
