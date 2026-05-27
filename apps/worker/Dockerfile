FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./

COPY packages ./packages
COPY apps/worker ./apps/worker

RUN pnpm install

WORKDIR /repo/apps/worker
ENV NITRO_PRESET=node-server
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

COPY apps/worker/package.json ./package.json
COPY pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate && pnpm install --prod

COPY --from=build /repo/apps/worker/.output ./.output
EXPOSE 3001
CMD ["node",".output/server/index.mjs"]
