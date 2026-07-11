-- 0016_equipment_purchases_warranties: acquisition records. A purchase commonly brings in
-- several individually-tracked items at once, so equipment_items.purchase_id links each
-- unit straight back to the purchase — no separate purchase-line-item table needed.

create table public.equipment_purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id),
  purchase_date date not null default current_date,
  invoice_number text,
  currency_code text not null references public.currencies (code),
  exchange_rate_id uuid references public.exchange_rates (id),
  subtotal_amount numeric(14, 2),
  tax_amount numeric(14, 2),
  total_amount numeric(14, 2) not null,
  status text not null default 'ordered' check (status in ('ordered', 'received', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.equipment_purchases is
  'A purchase order/invoice from a supplier. exchange_rate_id snapshots the rate used at purchase time so historical accounting stays consistent even as CDF/USD rates move.';

create index equipment_purchases_supplier_id_idx on public.equipment_purchases (supplier_id);
create index equipment_purchases_currency_code_idx on public.equipment_purchases (currency_code);
create index equipment_purchases_exchange_rate_id_idx on public.equipment_purchases (exchange_rate_id);
create index equipment_purchases_created_by_idx on public.equipment_purchases (created_by);
create index equipment_purchases_updated_by_idx on public.equipment_purchases (updated_by);
create index equipment_purchases_deleted_by_idx on public.equipment_purchases (deleted_by);

create trigger set_equipment_purchases_updated_at
  before update on public.equipment_purchases
  for each row
  execute function public.set_updated_at();

alter table public.equipment_items
  add constraint equipment_items_purchase_id_fkey
  foreign key (purchase_id) references public.equipment_purchases (id);

create table public.equipment_item_warranties (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items (id),
  purchase_id uuid references public.equipment_purchases (id),
  provider_type text not null check (provider_type in ('manufacturer', 'supplier', 'third_party')),
  provider_name text,
  warranty_type text,
  start_date date not null,
  end_date date not null,
  terms text,
  claim_contact text,
  status text not null default 'active' check (status in ('active', 'expired', 'voided', 'claimed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint equipment_item_warranties_dates_ck check (end_date >= start_date)
);

comment on table public.equipment_item_warranties is
  'One-to-many per item — an original manufacturer warranty plus any later extended warranty.';

create index equipment_item_warranties_item_id_idx on public.equipment_item_warranties (item_id);
create index equipment_item_warranties_purchase_id_idx on public.equipment_item_warranties (purchase_id);
create index equipment_item_warranties_created_by_idx on public.equipment_item_warranties (created_by);
create index equipment_item_warranties_updated_by_idx on public.equipment_item_warranties (updated_by);
create index equipment_item_warranties_deleted_by_idx on public.equipment_item_warranties (deleted_by);

create trigger set_equipment_item_warranties_updated_at
  before update on public.equipment_item_warranties
  for each row
  execute function public.set_updated_at();

alter table public.equipment_purchases enable row level security;
alter table public.equipment_item_warranties enable row level security;

create policy "equipment_purchases_select_financials"
  on public.equipment_purchases for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.financials.view'));

create policy "equipment_purchases_insert_managers"
  on public.equipment_purchases for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_purchases_update_managers"
  on public.equipment_purchases for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_purchases_delete_managers"
  on public.equipment_purchases for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_item_warranties_select_viewers"
  on public.equipment_item_warranties for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_item_warranties_insert_managers"
  on public.equipment_item_warranties for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_item_warranties_update_managers"
  on public.equipment_item_warranties for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_item_warranties_delete_managers"
  on public.equipment_item_warranties for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));
