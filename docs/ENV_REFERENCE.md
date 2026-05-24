# Environment variables

Every variable consumed by the platform. The API validates these at startup via Zod (`apps/api/src/lib/env.ts`); the server will refuse to boot with a missing or invalid value.

Legend: **R** = required in production · **O** = optional · *default in italics*

## Core

| Var | R/O | Type | Description |
|---|---|---|---|
| `NODE_ENV` | R | `development \| production \| test` | *development*. Toggles security headers, image optimization, log redaction. |
| `PROCESS_MODE` | R | `web \| worker \| all` | *all*. In production split `web` (HTTP) and `worker` (queues + scheduler). Scheduler must run in exactly one process. |
| `API_PORT` | R | number | *4000* |
| `API_HOST` | R | string | *0.0.0.0* |

## Database

| Var | R/O | Type | Description |
|---|---|---|---|
| `DATABASE_URL` | R | postgres URL | e.g. `postgresql://user:pass@host:5432/handicraft` |

## Auth & security

| Var | R/O | Type | Description |
|---|---|---|---|
| `JWT_SECRET` | R | string (≥16) | Generate: `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRES_IN` | O | string | *15m*. Vercel ms duration syntax. |
| `JWT_REFRESH_EXPIRES_IN` | O | string | *30d* |
| `CSRF_SECRET` | O | string (≥16) | Separate HMAC for double-submit CSRF tokens. Falls back to `JWT_SECRET`. |
| `WEBHOOK_SIGNING_SECRET` | R if outbound webhooks | string | Global HMAC for signing outbound webhooks. Per-endpoint secret takes priority. |
| `REVALIDATE_SECRET` | R if using ISR triggers | string | Shared secret used by the storefront's on-demand revalidation route. |

## Observability

| Var | R/O | Type | Description |
|---|---|---|---|
| `LOG_LEVEL` | O | pino level | *info*. One of `fatal error warn info debug trace`. |
| `SENTRY_DSN` | R in prod | string | Requires optional `@sentry/node` dependency at runtime. |
| `SENTRY_ENVIRONMENT` | O | string | Tag passed to Sentry (`production`, `staging`, …). |
| `SENTRY_TRACES_SAMPLE_RATE` | O | number 0..1 | *0*. Performance span sample rate. |
| `METRICS_AUTH_TOKEN` | R in prod | string | Bearer token required to scrape `/metrics`. Empty = anonymous (don't do this in prod). |

## Redis

| Var | R/O | Type | Description |
|---|---|---|---|
| `REDIS_URL` | R | url | *redis://localhost:6380*. Used by BullMQ, CSRF store, idempotency cache. |

## Frontend & CORS

| Var | R/O | Type | Description |
|---|---|---|---|
| `STOREFRONT_URL` | R | url | Server-side origin for CORS + email links. |
| `NEXT_PUBLIC_STOREFRONT_URL` | R | url | Public origin used in client bundle. |
| `NEXT_PUBLIC_API_URL` | R | url | Storefront → API base URL. |
| `VITE_API_URL` | R | url | Admin → API base URL. |
| `VITE_ADMIN_URL` | R | url | Admin's own origin for CORS allow-list. |

## Object storage (Cloudflare R2)

| Var | R/O | Type | Description |
|---|---|---|---|
| `R2_ACCOUNT_ID` | R if file uploads | string | |
| `R2_ACCESS_KEY_ID` | R if file uploads | string | |
| `R2_SECRET_ACCESS_KEY` | R if file uploads | string | Treat as a top-tier secret. |
| `R2_BUCKET_NAME` | R if file uploads | string | |
| `R2_PUBLIC_URL` | R if file uploads | url | Public read URL prefix. |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | R if file uploads | url | Same value, exposed to Next.js image optimizer allow-list. |

## SMTP

| Var | R/O | Type | Description |
|---|---|---|---|
| `SMTP_HOST` | R | string | *localhost*. Use MailHog locally (port 1025). |
| `SMTP_PORT` | R | number | *587* |
| `SMTP_USER` | O | string | |
| `SMTP_PASS` | O | string | |
| `SMTP_FROM` | R | string | RFC 5322 from line, e.g. `Handicraft <noreply@example.com>` |
| `SMTP_SECURE` | O | `true \| false` | *false*. Set `true` for TLS on connect (port 465). |

## Payments

| Provider | Vars | Required if enabled |
|---|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | yes |
| eSewa | `ESEWA_MERCHANT_CODE`, `ESEWA_SECRET_KEY`, `ESEWA_GATEWAY_URL` | yes |
| Khalti | `KHALTI_SECRET_KEY`, `KHALTI_GATEWAY_URL`, `KHALTI_REFUND_ENABLED` | yes |
| Fonepay | `FONEPAY_MERCHANT_CODE`, `FONEPAY_SECRET_KEY`, `FONEPAY_GATEWAY_URL` | yes |

## Development helpers (do not set in production)

| Var | Description |
|---|---|
| `ADMIN_PASSWORD` / `VENDOR_PASSWORD` / `CUSTOMER_PASSWORD` | Override seeded passwords. |
| `ALLOW_UNVERIFIED_REVIEWS` | Allow reviews from non-purchasers. Test fixture only. |
| `WIPE_DB` | When `true`, the migration runner drops everything. NEVER set in production. |
| `SKIP_R2` | Skip R2 client construction during boot. |

## Generating strong secrets

```bash
openssl rand -hex 32       # JWT_SECRET, CSRF_SECRET, WEBHOOK_SIGNING_SECRET, etc.
openssl rand -base64 32    # equivalent, shorter
```
