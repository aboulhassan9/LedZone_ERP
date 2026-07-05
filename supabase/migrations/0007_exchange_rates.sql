-- 0007_exchange_rates: historical USD<->CDF (and future currency pairs) exchange rates,
-- either entered manually or synced automatically. Rates are immutable once recorded —
-- a correction soft-deletes the wrong entry and inserts a new one, preserving history.

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null references public.currencies (code),
  quote_currency text not null references public.currencies (code),
  rate numeric(18, 6) not null check (rate > 0),
  rate_date date not null default current_date,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint exchange_rates_currency_pair_ck check (base_currency <> quote_currency)
);

comment on table public.exchange_rates is
  'Historical exchange rates between currency pairs. lib/exchange-rate reads the latest non-deleted row per pair for conversions.';

create unique index exchange_rates_pair_date_source_uq
  on public.exchange_rates (base_currency, quote_currency, rate_date, source)
  where deleted_at is null;

create index exchange_rates_lookup_idx
  on public.exchange_rates (base_currency, quote_currency, rate_date desc)
  where deleted_at is null;

create index exchange_rates_quote_currency_idx on public.exchange_rates (quote_currency);
create index exchange_rates_created_by_idx on public.exchange_rates (created_by);
create index exchange_rates_deleted_by_idx on public.exchange_rates (deleted_by);

alter table public.exchange_rates enable row level security;

create policy "exchange_rates_select_authenticated"
  on public.exchange_rates for select
  to authenticated
  using (true);

create policy "exchange_rates_insert_managers"
  on public.exchange_rates for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'exchange_rates.manage'));

create policy "exchange_rates_update_managers"
  on public.exchange_rates for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'exchange_rates.manage'))
  with check (public.has_permission((select auth.uid()), 'exchange_rates.manage'));

create policy "exchange_rates_delete_managers"
  on public.exchange_rates for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'exchange_rates.manage'));
