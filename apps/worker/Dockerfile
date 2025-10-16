FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./

COPY packages ./packages
COPY apps/worker ./apps/worker

RUN pnpm install --frozen-lockfile

WORKDIR /repo/apps/worker
ENV NITRO_PRESET=node-server
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

COPY --from=build /repo/apps/worker/.output ./.output
EXPOSE 3001
CMD ["node",".output/server/index.mjs"]
