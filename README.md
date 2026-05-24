# Handicraft Multivendor Platform

A production-oriented **single-store, multi-vendor headless marketplace** (think Daraz/Amazon model). One public storefront, many vendors, admin-managed users, strict ownership boundaries.

| Layer | Stack |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| API | Fastify, Drizzle ORM, Zod, PostgreSQL 16, Redis, BullMQ |
| Storefront | Next.js 15 (App Router, RSC, standalone output), React 19, Tailwind v4, shadcn/ui |
| Admin | React 19, Vite, React Router v7, Tailwind v4, shadcn/ui |
| Auth | JWT (`@fastify/jwt`) — admin / vendor / customer actors |
| Payments | Stripe, eSewa, Khalti, Fonepay |
| Object storage | Cloudflare R2 (S3-compatible) |
| Email | SMTP (any provider) |

---

## Apps & Packages

| Package | Description | Port |
|---|---|---|
| `apps/api` | Fastify REST API + Drizzle ORM + workers | `4000` |
| `apps/storefront` | Next.js 15 storefront | `3000` |
| `apps/admin` | React + Vite admin panel | `5173` |
| `packages/types` | Shared TypeScript types | — |
| `packages/config` | Shared constants & config | — |

---

## Prerequisites

- [Node.js](https://nodejs.org) >= 20
- [pnpm](https://pnpm.io) >= 9 — `npm install -g pnpm`
- [Docker](https://www.docker.com) (for local infra)

---

## Quick start

```bash
git clone <repo-url> handicraft-multivendor-platform
cd handicraft-multivendor-platform

pnpm setup     # cp .env.example .env, install, start docker, run migrations
pnpm start     # docker up (idempotent) + all three apps via Turborepo
```

…or step by step:

```bash
pnpm install
cp .env.example .env          # then edit values
pnpm docker:up                # postgres + redis + mailhog
pnpm db:migrate               # apply Drizzle migrations
pnpm dev                      # all apps
```

| App | URL |
|---|---|
| Storefront | http://localhost:3000 |
| Admin | http://localhost:5173 |
| API | http://localhost:4000 |
| MailHog UI | http://localhost:8025 |

---

## Local infrastructure (`docker compose up -d`)

| Service | Host port | Notes |
|---|---|---|
| Postgres 16 | `5433` → `5432` | DB: `handicraft`, user/pass: `postgres`/`password` |
| Redis 7 | `6380` → `6379` | BullMQ queues, idempotency, CSRF store |
| MailHog | `1025` (SMTP), `8025` (UI) | Catches all outbound dev mail |

```bash
pnpm docker:down          # stop containers (data preserved)
pnpm docker:reset         # stop + wipe volumes + restart fresh
pnpm docker:logs          # tail logs (Ctrl-C to detach)
pnpm docker:ps            # service status
pnpm docker:psql          # open a psql shell on the handicraft DB
pnpm docker:redis         # open redis-cli
```

---

## Environment

See **[docs/ENV_REFERENCE.md](docs/ENV_REFERENCE.md)** for every variable with type, default, and required-in-prod flag.

The most important knobs:

- **`JWT_SECRET`** — REQUIRED, 16+ chars. In production generate with `openssl rand -hex 32`.
- **`PROCESS_MODE`** — `web` | `worker` | `all`. Default `all` for dev. In production split web (HTTP only) from worker (queues + scheduler).
- **`DATABASE_URL`** — Postgres connection string.
- **`REDIS_URL`** — required for queues, CSRF, idempotency.

Everything is validated at startup via Zod (`apps/api/src/lib/env.ts`); the server refuses to boot with a missing/invalid variable.

---

## Database migrations

```bash
pnpm --filter @repo/api db:generate     # generate SQL from Drizzle schema
pnpm --filter @repo/api db:migrate      # apply pending migrations
```

Migrations live in `apps/api/drizzle/`.

---

## Running individual apps

```bash
pnpm --filter @repo/api dev
pnpm --filter @repo/storefront dev
pnpm --filter @repo/admin dev
```

---

## API surface

The API is organised into 40+ modules under `apps/api/src/modules/`. Routes are grouped by actor:

| Prefix | Audience | Sample modules |
|---|---|---|
| `/auth/*` | public | login, register, refresh, password reset, 2FA |
| `/admin/*` | admin JWT | vendors, products, orders, payouts, content, users, audit-logs, settings |
| `/vendor/*` | vendor JWT | own products, options, variants, orders, fulfillments, KYC, payouts |
| `/storefront/*` | public + customer JWT | products, collections, vendors, cart, checkout, customer account, reviews |
| `/webhooks/*` | provider | payment provider callbacks (signed) |

Full module list (`apps/api/src/modules/`):

```
api-keys           audit-logs          auth                campaigns
cart               checkout            collections         commission-rules
content            customer-segments   customers           dashboard
discounts          facet-filters       files               fulfillments
gift-cards         inventory           loyalty             messaging
metafields         newsletter          notifications       orders
payments           payouts             product-configurator products
recommendations    refunds             returns             reviews
search             settings            shipping            stock-notify
tax                users               vendor-addresses    vendor-kyc
vendor-memberships vendors             webhooks
```

The route reference lives in **[docs/ROUTES.md](docs/ROUTES.md)** and is also surfaced via the Swagger plugin (mounted in dev).

---

## Permission model

Three actor types with strict ownership, enforced on the **backend** in `apps/api/src/lib/permissions.ts`:

| Actor | Owns |
|---|---|
| `admin` (super_admin, store_admin, catalog_manager, content_manager, support_agent) | Platform — users, vendors, collections, pages, blogs, orders |
| `vendor` | Own catalog — products, options, variants, metafields, landing page, own order items |
| `customer` | Own account — profile, addresses, cart, wishlist, orders, reviews |

See [docs/PERMISSIONS.md](docs/PERMISSIONS.md) and [docs/OWNERSHIP_MATRIX.md](docs/OWNERSHIP_MATRIX.md) for the full matrix.

---

## Project structure

```
.
├── apps/
│   ├── api/                       Fastify API + workers
│   │   ├── src/
│   │   │   ├── db/schema/         Drizzle schemas (~50 tables)
│   │   │   ├── lib/               env, permissions, payments, webhooks, redis
│   │   │   ├── modules/           Route + service + repository per domain
│   │   │   ├── plugins/           Fastify plugins (auth, csrf, idempotency, metrics)
│   │   │   ├── workers/           BullMQ queue consumers (email, webhook)
│   │   │   └── __tests__/         Vitest integration tests
│   │   ├── drizzle/               Generated SQL migrations
│   │   └── Dockerfile
│   ├── storefront/                Next.js 15 (App Router, RSC, standalone)
│   └── admin/                     React 19 + Vite + nginx
├── packages/
│   ├── types/                     Shared TypeScript types
│   └── config/                    Reserved slugs, constants
├── docs/                          Architecture, routes, env, deployment
├── docker-compose.yml             Local infrastructure (postgres + redis + mailhog)
├── docker-compose.prod.yml        Reference production stack (apps + infra)
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Storefront routes

```
/                              Home
/products                      Catalog
/products/:handle              Product detail
/collections/:handle           Collection
/sale/:handle                  Sale page
/blogs/:handle                 Blog
/blogs/:handle/:postHandle     Blog post
/pages/:handle                 CMS page
/vendors                       Vendor directory
/:vendorSlug                   Vendor landing page
/search                        Search
/cart                          Cart
/wishlist                      Wishlist
/checkout                      Checkout (3 steps)
/customer/login                Customer login
/customer/register             Customer register
/customer/reset-password       Password reset
/customer/account              Account dashboard
/customer/orders               Order history
/customer/orders/:orderNumber  Order detail
```

---

## Docker — production images

Each app has a multi-stage Dockerfile rooted at the monorepo:

```bash
docker build -f apps/api/Dockerfile        -t handicraft-api .
docker build -f apps/storefront/Dockerfile -t handicraft-storefront .
docker build -f apps/admin/Dockerfile      -t handicraft-admin .
```

> Dockerfiles MUST be built from the monorepo root (`.`) to copy shared `packages/`.

Or run the full stack locally:

```bash
docker compose -f docker-compose.prod.yml up --build
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the production runbook (secrets, scaling, migrations, observability, rollback).

---

## Adding shadcn/ui components

```bash
cd apps/storefront && npx shadcn@latest add <component>
cd apps/admin      && npx shadcn@latest add <component>
```

---

## Lint / format / typecheck

```bash
pnpm lint            # ESLint, max-warnings=0
pnpm lint:fix
pnpm format          # Prettier
pnpm format:check
pnpm typecheck       # tsc across the workspace
```

ESLint rules:
- `@typescript-eslint` recommended
- `eslint-plugin-simple-import-sort`
- `eslint-plugin-unused-imports`
- `eslint-plugin-react-hooks` (storefront + admin)
- `@typescript-eslint/consistent-type-imports`

---

## Tests

```bash
pnpm --filter @repo/api test
```

Integration tests live in `apps/api/src/__tests__/`. CI runs them on every push (see `.github/workflows/ci.yml`).

---

## Docs

| File | Purpose |
|---|---|
| [docs/ENV_REFERENCE.md](docs/ENV_REFERENCE.md) | Every env var with type, default, required-in-prod |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production runbook — secrets, scaling, migrations, observability |
| [docs/ROUTES.md](docs/ROUTES.md) | Full route reference |
| [docs/PERMISSIONS.md](docs/PERMISSIONS.md) | Permission system |
| [docs/OWNERSHIP_MATRIX.md](docs/OWNERSHIP_MATRIX.md) | Who owns what |
| [docs/SKILLS.md](docs/SKILLS.md) | Project skills reference |
| [DEPLOY_DOKPLOY.md](DEPLOY_DOKPLOY.md) | Step-by-step Dokploy deployment |

---

## License

Proprietary — see LICENSE.
