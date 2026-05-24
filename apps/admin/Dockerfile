FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable pnpm

FROM base AS installer
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json   ./packages/types/package.json
COPY packages/config/package.json  ./packages/config/package.json
COPY apps/admin/package.json       ./apps/admin/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /repo
COPY --from=installer /repo ./
COPY packages    ./packages
COPY apps/admin  ./apps/admin
ARG VITE_API_URL
ARG VITE_ADMIN_URL
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT
ARG VITE_SENTRY_TRACES_SAMPLE_RATE
ARG VITE_SENTRY_REPLAYS_SAMPLE_RATE
ENV VITE_API_URL=$VITE_API_URL \
    VITE_ADMIN_URL=$VITE_ADMIN_URL \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT \
    VITE_SENTRY_TRACES_SAMPLE_RATE=$VITE_SENTRY_TRACES_SAMPLE_RATE \
    VITE_SENTRY_REPLAYS_SAMPLE_RATE=$VITE_SENTRY_REPLAYS_SAMPLE_RATE
RUN pnpm --filter @repo/admin build

FROM nginx:1.27-alpine AS runner
RUN apk add --no-cache wget
COPY --from=builder /repo/apps/admin/dist     /usr/share/nginx/html
COPY apps/admin/nginx.conf                    /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
