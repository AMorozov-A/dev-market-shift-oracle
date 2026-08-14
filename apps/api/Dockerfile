# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --filter @dev-market-oracle/api... --frozen-lockfile=false

FROM deps AS build
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api
RUN pnpm --filter @dev-market-oracle/shared-types build \
  && pnpm --filter @dev-market-oracle/api prisma:generate \
  && pnpm --filter @dev-market-oracle/api build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
COPY apps/api/docker-entrypoint.sh /app/apps/api/docker-entrypoint.sh
RUN chmod +x /app/apps/api/docker-entrypoint.sh
EXPOSE 3000
WORKDIR /app/apps/api
CMD ["/app/apps/api/docker-entrypoint.sh"]
