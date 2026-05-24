# Dokploy deployment — Himalayan Crafts

Step-by-step deploy of the full stack to a single Dokploy server using the **local Postgres + local Redis + Resend** profile.

The repo already ships a production-ready [docker-compose.prod.yml](docker-compose.prod.yml) with: Postgres 16, Redis 7, API (web + worker), Storefront (Next.js standalone), Admin (Vite SPA via nginx).

## Pre-flight (do these BEFORE the demo)

1. **Generate strong secrets** locally (paste these into Dokploy env later):
   ```bash
   openssl rand -hex 32   # JWT_SECRET
   openssl rand -hex 32   # CSRF_SECRET
   openssl rand -hex 32   # WEBHOOK_SIGNING_SECRET
   openssl rand -hex 32   # REVALIDATE_SECRET
   openssl rand -hex 32   # METRICS_AUTH_TOKEN
   openssl rand -hex 24   # POSTGRES_PASSWORD
   ```

2. **Resend setup**:
   - Create API key at https://resend.com/api-keys
   - Verify your sending domain (`morgenland-teppiche.de` or whichever you'll use)
   - Add DNS records Resend gives you (SPF / DKIM / DMARC) — without these, mail goes to spam

3. **DNS** — point three subdomains at your Dokploy server IP:
   - `shop.yourdomain.com` → storefront (port 3000)
   - `api.yourdomain.com` → api (port 4000)
   - `admin.yourdomain.com` → admin (port 5173)

## Dokploy steps

### Option A — single docker-compose app (simplest)

1. In Dokploy: **Create → Docker Compose**
2. Source: your Git repo, branch `main` (or wherever the code lives)
3. Compose file path: `docker-compose.prod.yml`
4. Add a `.env.prod` file via the Dokploy "Environment" tab. Use [.env.example](.env.example) as template. **Required values**:

   ```env
   # Database & cache
   POSTGRES_PASSWORD=<generated above>

   # Secrets (paste the openssl outputs)
   JWT_SECRET=
   CSRF_SECRET=
   WEBHOOK_SIGNING_SECRET=
   REVALIDATE_SECRET=
   METRICS_AUTH_TOKEN=

   # Public URLs (must match the DNS subdomains above)
   STOREFRONT_URL=https://shop.yourdomain.com
   NEXT_PUBLIC_STOREFRONT_URL=https://shop.yourdomain.com
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   VITE_API_URL=https://api.yourdomain.com
   VITE_ADMIN_URL=https://admin.yourdomain.com

   # Email — Resend
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_USER=resend
   SMTP_PASS=<resend api key>
   SMTP_FROM=Himalayan Crafts <noreply@yourdomain.com>
   SMTP_SECURE=true

   # Optional: skip if not using R2 — uploads break but app boots fine
   R2_ACCOUNT_ID=
   R2_ACCESS_KEY_ID=
   R2_SECRET_ACCESS_KEY=
   R2_BUCKET_NAME=
   R2_PUBLIC_URL=
   NEXT_PUBLIC_R2_PUBLIC_URL=

   # Optional: leave blank to disable Sentry / Stripe / eSewa / Khalti
   SENTRY_DSN=
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   ESEWA_MERCHANT_CODE=
   ESEWA_SECRET_KEY=
   KHALTI_SECRET_KEY=
   ```

5. **Deploy** → wait for all 5 services (postgres, redis, api-web, api-worker, storefront, admin) to go green.

6. **Run migrations** (first deploy only) — Dokploy terminal into `api-web`:
   ```bash
   node node_modules/drizzle-kit/bin.cjs migrate
   ```
   Or if `drizzle-kit` isn't bundled, exec into the container and run from the source tree.

7. **Seed demo data** (optional, for the client demo):
   ```bash
   node dist/db/seed.js
   ```
   (skip if you've already imported real data)

8. **Wire Dokploy domains** to each service:
   - `shop.yourdomain.com` → `storefront:3000`
   - `api.yourdomain.com` → `api-web:4000`
   - `admin.yourdomain.com` → `admin:80`
   - Enable Let's Encrypt SSL on each in Dokploy

### Option B — separate apps in Dokploy (more flexible)

Each service can be its own Dokploy "Application" pointing at the same git repo with a per-service Dockerfile. Use this when you want per-service scaling / different deploy cadences.

Build contexts:
- API: `Dockerfile: apps/api/Dockerfile`, run two instances with `PROCESS_MODE=web` and one with `PROCESS_MODE=worker`
- Storefront: `apps/storefront/Dockerfile`, build args `NEXT_PUBLIC_API_URL` etc.
- Admin: `apps/admin/Dockerfile`, build args `VITE_API_URL` etc.

Postgres + Redis: create as separate Dokploy "Database" services (they have first-class support).

## Post-deploy smoke test

```bash
# API healthy
curl https://api.yourdomain.com/health

# Storefront serves
curl -I https://shop.yourdomain.com

# Admin loads (returns HTML shell)
curl -I https://admin.yourdomain.com
```

Then open https://admin.yourdomain.com and log in with the bootstrap admin from seed data (check `apps/api/src/db/seed.ts` — typically `admin@example.com` / a default password — **change immediately**).

## Things to know / gotchas

- **The worker service MUST stay at replicas: 1.** It runs the scheduler. Scaling > 1 will fire scheduled jobs twice.
- **Storefront is a Next.js standalone build** — it talks to the API via the `NEXT_PUBLIC_API_URL` you set at build time. If you change the API URL, you must rebuild the storefront image.
- **Admin is a static Vite build** — same story for `VITE_API_URL`.
- **First deploy will be slow** (~5–10 min) — three multi-stage Docker builds.
- **Migrations are not auto-run.** The API will start but most endpoints will 500 until you run them.
