# LED Zone ERP

Internal ERP for LED Zone (Kinshasa, DRC) — an event production / AV equipment rental
company. This repository currently ships **Module 1: Core Platform Foundation** (auth,
RBAC, company/currency settings, audit log, notifications) that every future business
module (CRM, Events, Inventory, Warehouse, Rental, Fleet, Finance, HR, Documents, Reports,
AI Assistant) builds on top of.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres, Auth,
Storage, RLS) · Prisma (typed client over the same schema) · React Query · React Hook Form · Zod

## Architecture

- **`supabase/migrations/`** — source of truth for the database: tables, RLS policies,
  triggers, and Postgres functions. Applied via the Supabase CLI/MCP, in numeric order.
- **`prisma/schema.prisma`** — typed Prisma Client over that same schema, kept in sync via
  `npm run db:pull` after any migration change. `prisma/seed.ts` seeds only system rows
  (default roles, permission grants) — never demo/business data.
- **`modules/`** — feature-based (vertical slice) architecture. Each module owns its
  `components/hooks/services/actions/schemas/validators/types/constants`. `app/` routes are
  thin wrappers that import from here.
- **`lib/`** — cross-cutting concerns: Supabase clients, auth/permission helpers, storage,
  currency/exchange-rate, and shared services (QR/barcode/PDF generation, notifications).
- **`providers/`** — root-level React providers (theme, React Query, auth context).

See each `modules/<name>/README.md` for modules that are scaffolded but not yet built.

## Local setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard → Project Settings → API
   - `DATABASE_URL` / `DIRECT_URL` — Supabase Dashboard → Project Settings → Database →
     Connection string (Transaction pooler for `DATABASE_URL`, Session pooler/direct for
     `DIRECT_URL`)
3. `npm run db:pull` — introspect the live schema into `prisma/schema.prisma`, then `npx
   prisma generate`
4. `npm run dev` — http://localhost:3000

There is no public sign-up: create your first user from the Supabase Dashboard (Auth →
Users → Add user), then grant them the "Super Admin" role directly in the `user_roles`
table so they can invite everyone else through the app's Users admin page.

## Deploying

Connect this repository to Vercel and set the same environment variables as above in the
Vercel project settings (Production + Preview).
