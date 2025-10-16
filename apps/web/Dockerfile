# -----------------------------
# Build stage
# -----------------------------
FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable

# Monorepo basics
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY packages ./packages

# Which app are we building? (default: apps/web)
ARG APP_DIR=apps/web
ENV APP_DIR=${APP_DIR}

# Copy just this app into the build context
COPY ${APP_DIR} ./${APP_DIR}

# Install deps after all workspaces & app are present
RUN pnpm install --frozen-lockfile

# Build Next.js (standalone)
WORKDIR /repo/${APP_DIR}
ENV NEXT_TELEMETRY_DISABLED=1

# --- Build-time placeholders (server-only) ---
# Safe placeholders so build doesn't fail if some code reads env at build.
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/postgres"
ARG DATABASE_RLS_URL="postgresql://user:pass@localhost:5432/postgres"
ARG SERVICE_ROLE_KEY="placeholder"
ARG REDIS_PASSWORD="placeholder"
ARG REDIS_HOST=redis
ARG REDIS_PORT=6379
ARG TYPESENSE_API_KEY=1234
ARG TYPESENSE_PORT=1234
ARG TYPESENSE_PROTOCOL=http
ARG TYPESENSE_HOST=placeholder
ARG SEARCH_REBUILD_ON_BOOT=false

ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_RLS_URL=$DATABASE_RLS_URL
ENV SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV REDIS_PASSWORD=$REDIS_PASSWORD
ENV REDIS_HOST=$REDIS_HOST
ENV REDIS_PORT=$REDIS_PORT
ENV TYPESENSE_API_KEY=$TYPESENSE_API_KEY
ENV TYPESENSE_PORT=$TYPESENSE_PORT
ENV TYPESENSE_PROTOCOL=$TYPESENSE_PROTOCOL
ENV TYPESENSE_HOST=$TYPESENSE_HOST
ENV SEARCH_REBUILD_ON_BOOT=$SEARCH_REBUILD_ON_BOOT
# ---------------------------------------------

RUN pnpm run build


# -----------------------------
# Runtime stage (standalone)
# -----------------------------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Keep the same APP_DIR value at runtime
ARG APP_DIR=apps/web
ENV APP_DIR=${APP_DIR}

# Copy the minimal standalone output
# .next/standalone includes all required prod deps
COPY --from=build /repo/${APP_DIR}/.next/standalone ./
# Static assets + public
COPY --from=build /repo/${APP_DIR}/.next/static ./${APP_DIR}/.next/static
COPY --from=build /repo/${APP_DIR}/public ./${APP_DIR}/public

EXPOSE 3000
# In a monorepo, Next puts server.js under {APP_DIR}/server.js
CMD ["sh", "-c", "node $APP_DIR/server.js"]

