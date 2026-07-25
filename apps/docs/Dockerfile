# --- build ---
FROM node:22-alpine AS build
WORKDIR /app

# (optional, but helps some native deps on alpine)
RUN apk add --no-cache libc6-compat

# use pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

# copy app and build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm install --no-frozen-lockfile && pnpm run build

# --- runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# the standalone bundle includes its own node_modules and package.json
CMD ["node", "server.js"]
