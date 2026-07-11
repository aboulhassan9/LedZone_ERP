-- 0068_finance_invoices: Module 8 (Finance), invoicing half. Bills a customer for an event
-- and/or rental agreement -- both optional links, same additive-FK pattern used throughout
-- (an invoice can exist for ad-hoc work with neither). Payments are their own append-only table
-- (invoice_payments) rather than a single "amount_paid" column, so partial payments and the
-- method/reference of each one are preserved -- status itself stays a manual, explicit
-- transition (same proportionate-scope decision as quotes/rental_agreements' status), not
-- auto-derived from the payment sum.

create sequence public.invoice_number_seq;

create function public.generate_invoice_number()
returns text
language sql
stable
set search_path = public
as $$
  select 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
$$;

comment on function public.generate_invoice_number is
  'Human-readable sequential invoice number, e.g. INV-000001.';

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references public.customers (id),
  event_id uuid references public.events (id),
  rental_agreement_id uuid references public.rental_agreements (id),
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'paid', 'cancelled')
  ),
  currency_code text not null references public.currencies (code),
  issue_date date not null default current_date,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.invoices is
  'A bill sent to a customer. "Overdue" is computed in the UI from due_date, not a stored status.';

create index invoices_customer_id_idx on public.invoices (customer_id);
create index invoices_event_id_idx on public.invoices (event_id);
create index invoices_rental_agreement_id_idx on public.invoices (rental_agreement_id);
create index invoices_status_idx on public.invoices (status);
create index invoices_currency_code_idx on public.invoices (currency_code);
create index invoices_created_by_idx on public.invoices (created_by);
create index invoices_updated_by_idx on public.invoices (updated_by);
create index invoices_deleted_by_idx on public.invoices (deleted_by);

create trigger set_invoices_updated_at
  before update on public.invoices
  for each row
  execute function public.set_updated_at();

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id),
  description text not null,
  quantity numeric(14, 2) not null default 1 check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index invoice_line_items_invoice_id_idx on public.invoice_line_items (invoice_id);

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id),
  amount numeric(14, 2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text not null check (
    method in ('cash', 'bank_transfer', 'mobile_money', 'other')
  ),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

comment on table public.invoice_payments is
  'Append-only record of money received against an invoice. Sum against invoice line-item totals to show payment progress.';

create index invoice_payments_invoice_id_idx on public.invoice_payments (invoice_id);
create index invoice_payments_created_by_idx on public.invoice_payments (created_by);

alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_payments enable row level security;

create policy "invoices_select_viewers"
  on public.invoices for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'finance.view'));

create policy "invoices_insert_managers"
  on public.invoices for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.invoices.manage')
  );

create policy "invoices_update_managers"
  on public.invoices for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.invoices.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.invoices.manage')
  );

create policy "invoice_line_items_select_viewers"
  on public.invoice_line_items for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'finance.view'));

create policy "invoice_line_items_insert_managers"
  on public.invoice_line_items for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.invoices.manage')
  );

create policy "invoice_line_items_update_managers"
  on public.invoice_line_items for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.invoices.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.invoices.manage')
  );

create policy "invoice_line_items_delete_managers"
  on public.invoice_line_items for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.invoices.manage')
  );

create policy "invoice_payments_select_viewers"
  on public.invoice_payments for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'finance.view'));

create policy "invoice_payments_insert_managers"
  on public.invoice_payments for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.invoices.manage')
  );

create policy "invoice_payments_delete_managers"
  on public.invoice_payments for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'finance.manage'));
