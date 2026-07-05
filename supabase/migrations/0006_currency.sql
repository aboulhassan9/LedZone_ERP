-- 0006_currency: supported currencies. Every future money-handling module (Rental, Finance,
-- HR/Payroll) references currencies.code as a foreign key.

create table public.currencies (
  code text primary key, -- ISO 4217, e.g. 'USD', 'CDF'
  name text not null,
  symbol text not null,
  decimal_places smallint not null default 2,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

comment on table public.currencies is 'Supported currencies. LED Zone operates in USD and CDF (Congolese Franc).';

create index currencies_updated_by_idx on public.currencies (updated_by);

create trigger set_currencies_updated_at
  before update on public.currencies
  for each row
  execute function public.set_updated_at();

insert into public.currencies (code, name, symbol, decimal_places) values
  ('USD', 'US Dollar', '$', 2),
  ('CDF', 'Congolese Franc', 'FC', 2);

alter table public.company_profile
  add constraint company_profile_default_currency_fkey
  foreign key (default_currency) references public.currencies (code);

alter table public.currencies enable row level security;

create policy "currencies_select_authenticated"
  on public.currencies for select
  to authenticated
  using (true);

create policy "currencies_insert_managers"
  on public.currencies for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'currency.manage'));

create policy "currencies_update_managers"
  on public.currencies for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'currency.manage'))
  with check (public.has_permission((select auth.uid()), 'currency.manage'));

create policy "currencies_delete_managers"
  on public.currencies for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'currency.manage'));
