-- 0001_core: extensions + shared helper function used by every later migration.
-- No domain tables here — this is the foundation every other migration builds on.

create extension if not exists pgcrypto;

-- Every table with an `updated_at` column reuses this trigger function instead
-- of redefining it per table. search_path is pinned (not left to the caller's session)
-- and direct RPC execution is revoked since this must only ever run as a trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from anon, authenticated, public;
