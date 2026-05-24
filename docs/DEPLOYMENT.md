# Deployment runbook

This document captures everything an operator needs to deploy and run the Handicraft Multivendor Platform in production. For the env-var schema see [ENV_REFERENCE.md](ENV_REFERENCE.md).

## Topology

In production the API runs as **two distinct deployments** of the same image, differentiated only by `PROCESS_MODE`:

```
                   ┌───────────────────────┐
   internet ──────►│  storefront (Next.js) │──┐
                   └───────────────────────┘  │
                   ┌───────────────────────┐  │     ┌───────────┐
                   │  admin (nginx + SPA)  │──┼────►│    API    │
                   └───────────────────────┘  │     │ web (n≥2) │──► Postgres
                                              │     └───────────┘    Redis
                                              │     ┌───────────┐    R2
                                              └────►│    API    │
                                                    │ worker (1)│
                                                    └───────────┘
```

- `PROCESS_MODE=web` — HTTP only; **horizontally scalable** (any replica count behind a load balancer).
- `PROCESS_MODE=worker` — BullMQ consumers + cron scheduler; **must run as exactly one replica** (the scheduler is not distributed).
- `PROCESS_MODE=all` — single-process for dev only.

## Images

Build from the **monorepo root**:

```bash
docker build -f apps/api/Dockerfile        -t handicraft-api:$SHA .
docker build -f apps/storefront/Dockerfile -t handicraft-storefront:$SHA .
docker build -f apps/admin/Dockerfile      -t handicraft-admin:$SHA .
```

All three are multi-stage and run as non-root with a `HEALTHCHECK`. The API uses `dumb-init` for correct signal handling.

Build args passed at storefront build time:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STOREFRONT_URL`
- `NEXT_PUBLIC_R2_PUBLIC_URL`

Build args passed at admin build time:
- `VITE_API_URL`

`NEXT_PUBLIC_*` and `VITE_*` values are **baked into the client bundle at build time**; you cannot change them at runtime.

## Secrets management

Provide secrets via your platform's native facility — never a baked `.env`:

| Platform | Mechanism |
|---|---|
| Kubernetes | `Secret` mounted as env (`envFrom: secretRef`) |
| AWS ECS / Fargate | Secrets Manager / SSM Parameter Store via task definition |
| Fly.io | `fly secrets set` |
| Render / Railway | Environment tab in dashboard |
| Docker Compose | `.env` file outside of source control + `env_file:` directive |

Required production secrets (minimum):

```
JWT_SECRET              (openssl rand -hex 32)
CSRF_SECRET             (openssl rand -hex 32)
WEBHOOK_SIGNING_SECRET  (openssl rand -hex 32)
REVALIDATE_SECRET       (openssl rand -hex 32)
DATABASE_URL
REDIS_URL
METRICS_AUTH_TOKEN
R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
SMTP_USER / SMTP_PASS
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
ESEWA_SECRET_KEY / KHALTI_SECRET_KEY / FONEPAY_SECRET_KEY
SENTRY_DSN
```

## Database

### First-time setup

```bash
# from a host that can reach the DB
DATABASE_URL=... pnpm --filter @repo/api db:migrate
```

The image ships `drizzle/` so migrations can also be applied from inside a container:

```bash
docker run --rm \
  -e DATABASE_URL=$DATABASE_URL \
  handicraft-api:$SHA \
  node dist/db/migrate.js
```

### Rolling deploys

1. Apply schema migration **before** rolling new code (forward-compatible only).
2. Deploy new image to `web` replicas (rolling).
3. Deploy new image to the single `worker` replica.
4. Run any data backfills as one-shot jobs.
5. Apply destructive cleanup migrations in the **next** release.

Never combine a destructive schema change and the code that drops the column reference in the same release.

### Backups

- Take daily logical backups (`pg_dump`) and stream WAL to S3/R2 for point-in-time recovery.
- Test restore quarterly into a staging DB.
- Retention: 30 days minimum.

## Observability

- **Logs** — stdout, Pino structured JSON, request IDs on every line. Ship to your aggregator (CloudWatch / Datadog / Loki).
- **Metrics** — `GET /metrics` (Prometheus). Protect with `METRICS_AUTH_TOKEN`.
- **Errors** — Sentry via `SENTRY_DSN`. Set `SENTRY_TRACES_SAMPLE_RATE` between `0.05` and `0.2` in prod.
- **Health checks**:
  - `GET /live` — process liveness (cheap, no I/O).
  - `GET /ready` — DB + Redis ping. Use as the Kubernetes readiness probe.
  - `GET /health` — composite, slowest. Use for synthetic monitoring.

Recommended Kubernetes probes:
```yaml
livenessProbe:
  httpGet: { path: /live, port: 4000 }
  initialDelaySeconds: 15
  periodSeconds: 30
readinessProbe:
  httpGet: { path: /ready, port: 4000 }
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

## Scaling

| Concern | Lever |
|---|---|
| Throughput (HTTP) | Increase `web` replicas + DB connection pool size |
| Queue depth | Increase `worker` concurrency (not replica count — scheduler is singleton) |
| Cold start | Set `MIN_REPLICAS ≥ 2` for `web` |
| DB contention | Front Postgres with PgBouncer (transaction pooling) |

## Rate limiting

A global limit is registered at the API level. Tighten per-endpoint limits in `apps/api/src/index.ts` for:

- `POST /auth/*` (brute-force defence)
- `POST /checkout`, `POST /orders`, `POST /payments` (payment abuse)
- `POST /refunds`, `POST /returns` (admin abuse window)

## Rollback

```bash
# blue/green: switch the load balancer back to the previous image tag
kubectl set image deploy/handicraft-api-web api=handicraft-api:$PREVIOUS_SHA
kubectl set image deploy/handicraft-api-worker api=handicraft-api:$PREVIOUS_SHA
```

If you need to roll back across a schema change, restore from backup; never run `down` migrations against production.

## Pre-deploy checklist

- [ ] `JWT_SECRET` is unique per environment (not the dev default)
- [ ] All payment provider keys swapped for production credentials
- [ ] `METRICS_AUTH_TOKEN` set and stored in your secret manager
- [ ] Webhook endpoints registered with each payment provider's dashboard
- [ ] Webhook URLs use HTTPS, sign every callback
- [ ] CSP wildcard `connect-src https:` tightened to the API origin (admin nginx config)
- [ ] Backups verified within last 30 days
- [ ] `web` deployment has ≥ 2 replicas
- [ ] `worker` deployment is exactly 1 replica
- [ ] Database migration has been applied successfully
- [ ] Sentry receiving events from each environment
- [ ] Synthetic monitor pings `GET /health` from outside the cluster

## Known gaps

These are tracked as production-readiness follow-ups:

- Idempotency wrapper not applied to all checkout/order/payment mutation routes.
- DB connection pooling depends on the platform — set `pool_max_connections` based on your DB tier.
- BullMQ workers do not yet supervise their own crash loop — fail-fast and rely on the orchestrator restart policy.
- Per-endpoint rate limits not yet defined (only a global limiter is active).
- No automated migration rollback — recovery is via backup restore.
