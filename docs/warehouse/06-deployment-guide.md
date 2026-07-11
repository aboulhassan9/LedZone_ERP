# Warehouse Module — Deployment Guide

## Migrations

Apply `supabase/migrations/0027` through `0044` in order (they're already applied to the
live project `eorcwvtoudxtkxqmbqbj` as of Module 3.5). If standing up a new environment:

```bash
supabase db push   # or apply each 00NN file in numeric order via the Supabase MCP/CLI
```

`0044` depends on `0029` (the `warehouse_location_codes` table) and `0039` (the permission
keys) already existing.

## Storage buckets

`warehouse-docs` (private) is created in `0038`. It shares the existing `qr-codes`/
`barcodes` public buckets (Module 1) for location labels, stored under a `warehouse-labels/`
path prefix — no new bucket needed for those.

## Environment variables

No new environment variables beyond what Module 1/2 already require
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`DATABASE_URL`/`DIRECT_URL` for Prisma).

## Prisma

`prisma/schema.prisma` must reflect all Module 3 tables. After applying migrations:

```bash
npx prisma db pull   # or hand-sync, per this project's established workflow
npx prisma generate
```

## Permissions

New environments seed roles via `prisma/seed.ts` (Super Admin/Admin/Manager/Employee), but
**no role is granted any `warehouse.*` permission by default** — grant them via **Admin →
Roles & Permissions** after deployment, per the key list in `05-admin-guide.md`.

## Build verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

All three must pass clean before considering a Warehouse change deployable — this has been
the gate for every module in this project and Module 3.5 re-confirmed it holds after every
fix applied during the audit.

## Rollback

Every migration in this range is additive (new tables/columns/functions) except `0043`
(renamed `warehouse_transfers.status` values, safe because the table had zero rows at the
time). There is no destructive migration to roll back in this range; reverting to a prior
commit and leaving the schema ahead is safe (unused new tables/columns, no data loss risk).
