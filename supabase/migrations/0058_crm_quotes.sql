-- 0058_crm_quotes: quotes feeding into future Events/Rental modules, per the original CRM
-- module scope note ("client/contact management, leads, and quotes feeding into Events").
-- event_reference is an additive-FK-later text field, same pattern as
-- warehouse_dispatch_records.destination_reference and equipment_plans.event_reference -- no
-- Events table exists yet. unit_price/currency_code are snapshotted per quote line, not read
-- from a live catalog rate (equipment_models has no price field -- a quote is where a price is
-- first decided, not looked up).

create sequence public.quote_number_seq;

create function public.generate_quote_number()
returns text
language sql
stable
as $$
  select 'Q-' || lpad(nextval('public.quote_number_seq')::text, 6, '0');
$$;

comment on function public.generate_quote_number is
  'Human-readable sequential quote number, e.g. Q-000001. Called by create_quote() (0059).';

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  customer_id uuid not null references public.customers (id),
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'accepted', 'rejected', 'expired')
  ),
  valid_until date,
  currency_code text not null references public.currencies (code),
  event_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.quotes is
  'A quote/estimate for a customer, optionally referencing a future event (event_reference, additive-FK-later). Line-item prices are snapshotted here, not read from a live catalog rate.';

create index quotes_customer_id_idx on public.quotes (customer_id);
create index quotes_status_idx on public.quotes (status);
create index quotes_currency_code_idx on public.quotes (currency_code);
create index quotes_created_by_idx on public.quotes (created_by);
create index quotes_updated_by_idx on public.quotes (updated_by);
create index quotes_deleted_by_idx on public.quotes (deleted_by);

create trigger set_quotes_updated_at
  before update on public.quotes
  for each row
  execute function public.set_updated_at();

create table public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id),
  model_id uuid not null references public.equipment_models (id),
  quantity numeric(14, 2) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.quote_line_items is
  'One line per model requested on a quote, with the price offered at quote time.';

create index quote_line_items_quote_id_idx on public.quote_line_items (quote_id);
create index quote_line_items_model_id_idx on public.quote_line_items (model_id);

alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;

create policy "quotes_select_viewers"
  on public.quotes for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'crm.view'));

create policy "quotes_insert_managers"
  on public.quotes for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.quotes.manage')
  );

create policy "quotes_update_managers"
  on public.quotes for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.quotes.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.quotes.manage')
  );

create policy "quote_line_items_select_viewers"
  on public.quote_line_items for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'crm.view'));

create policy "quote_line_items_insert_managers"
  on public.quote_line_items for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.quotes.manage')
  );

create policy "quote_line_items_update_managers"
  on public.quote_line_items for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.quotes.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.quotes.manage')
  );

create policy "quote_line_items_delete_managers"
  on public.quote_line_items for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.quotes.manage')
  );
