FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN apk add --no-cache dumb-init && corepack enable pnpm

FROM base AS installer
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json   ./packages/types/package.json
COPY packages/config/package.json  ./packages/config/package.json
COPY apps/api/package.json         ./apps/api/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /repo
COPY --from=installer /repo ./
COPY tsconfig.json ./tsconfig.json
COPY packages   ./packages
COPY apps/api   ./apps/api
RUN pnpm --filter @repo/api build \
 && find /repo/apps/api/dist -name '*.map' -delete

FROM base AS deployer
WORKDIR /repo
COPY --from=builder /repo ./
RUN pnpm --filter @repo/api --prod deploy /prod/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init wget \
 && addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs api
COPY --from=deployer --chown=api:nodejs /prod/api/node_modules ./node_modules
COPY --from=deployer --chown=api:nodejs /prod/api/package.json ./package.json
COPY --from=builder  --chown=api:nodejs /repo/apps/api/dist    ./dist
COPY --from=builder  --chown=api:nodejs /repo/apps/api/drizzle ./drizzle

USER api
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://localhost:4000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
# cache-bust 1779619407
