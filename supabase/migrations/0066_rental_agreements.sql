-- 0066_rental_agreements: Module 7 (Rental). The commercial contract that formalizes a
-- customer's rental of equipment for a period -- pricing, deposit, and the agreement's own
-- draft/active/completed/cancelled status. This deliberately does NOT re-track individual
-- equipment_items or their physical checkout/check-in: Module 4 (Planning) + Module 3
-- (Warehouse) already own that ground end-to-end (prepare/load/complete drives
-- reserved -> picked -> in_transit -> returned via their existing, reviewed pipeline). An
-- agreement optionally links to the event it serves and the quote it was accepted from, same
-- additive-FK-later-made-real pattern used for equipment_plans/quotes' event links.

create sequence public.rental_agreement_number_seq;

create function public.generate_rental_agreement_number()
returns text
language sql
stable
set search_path = public
as $$
  select 'RA-' || lpad(nextval('public.rental_agreement_number_seq')::text, 6, '0');
$$;

comment on function public.generate_rental_agreement_number is
  'Human-readable sequential agreement number, e.g. RA-000001.';

create table public.rental_agreements (
  id uuid primary key default gen_random_uuid(),
  agreement_number text not null unique,
  customer_id uuid not null references public.customers (id),
  event_id uuid references public.events (id),
  quote_id uuid references public.quotes (id),
  status text not null default 'draft' check (
    status in ('draft', 'active', 'completed', 'cancelled')
  ),
  currency_code text not null references public.currencies (code),
  rental_start_at timestamptz not null,
  rental_end_at timestamptz not null,
  deposit_amount numeric(14, 2) not null default 0 check (deposit_amount >= 0),
  deposit_status text not null default 'held' check (
    deposit_status in ('held', 'refunded', 'forfeited')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint rental_agreements_window check (rental_end_at > rental_start_at)
);

comment on table public.rental_agreements is
  'A binding rental contract with a customer -- pricing, deposit, and rental period. Physical equipment operations for the underlying items are Planning/Warehouse''s job, not this table''s.';

create index rental_agreements_customer_id_idx on public.rental_agreements (customer_id);
create index rental_agreements_event_id_idx on public.rental_agreements (event_id);
create index rental_agreements_quote_id_idx on public.rental_agreements (quote_id);
create index rental_agreements_status_idx on public.rental_agreements (status);
create index rental_agreements_currency_code_idx on public.rental_agreements (currency_code);
create index rental_agreements_created_by_idx on public.rental_agreements (created_by);
create index rental_agreements_updated_by_idx on public.rental_agreements (updated_by);
create index rental_agreements_deleted_by_idx on public.rental_agreements (deleted_by);

create trigger set_rental_agreements_updated_at
  before update on public.rental_agreements
  for each row
  execute function public.set_updated_at();

create table public.rental_agreement_line_items (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.rental_agreements (id),
  model_id uuid not null references public.equipment_models (id),
  quantity numeric(14, 2) not null check (quantity > 0),
  daily_rate numeric(14, 2) not null check (daily_rate >= 0),
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.rental_agreement_line_items is
  'One line per model rented on an agreement, with the daily rate agreed at signing time.';

create index rental_agreement_line_items_agreement_id_idx on public.rental_agreement_line_items (agreement_id);
create index rental_agreement_line_items_model_id_idx on public.rental_agreement_line_items (model_id);

alter table public.rental_agreements enable row level security;
alter table public.rental_agreement_line_items enable row level security;

create policy "rental_agreements_select_viewers"
  on public.rental_agreements for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'rental.view'));

create policy "rental_agreements_insert_managers"
  on public.rental_agreements for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'rental.manage')
    or public.has_permission((select auth.uid()), 'rental.create')
  );

create policy "rental_agreements_update_managers"
  on public.rental_agreements for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'rental.manage')
    or public.has_permission((select auth.uid()), 'rental.update')
  )
  with check (
    public.has_permission((select auth.uid()), 'rental.manage')
    or public.has_permission((select auth.uid()), 'rental.update')
  );

create policy "rental_agreement_line_items_select_viewers"
  on public.rental_agreement_line_items for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'rental.view'));

create policy "rental_agreement_line_items_insert_managers"
  on public.rental_agreement_line_items for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'rental.manage')
    or public.has_permission((select auth.uid()), 'rental.create')
  );

create policy "rental_agreement_line_items_update_managers"
  on public.rental_agreement_line_items for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'rental.manage')
    or public.has_permission((select auth.uid()), 'rental.update')
  )
  with check (
    public.has_permission((select auth.uid()), 'rental.manage')
    or public.has_permission((select auth.uid()), 'rental.update')
  );

create policy "rental_agreement_line_items_delete_managers"
  on public.rental_agreement_line_items for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'rental.manage')
    or public.has_permission((select auth.uid()), 'rental.update')
  );
