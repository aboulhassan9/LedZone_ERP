-- 0017_equipment_depreciation_valuations: value & depreciation — INPUTS ONLY, no
-- calculation. equipment_depreciation_policies stores exactly the four fields requested
-- (purchase cost, salvage value, useful life, method) and nothing else; actual
-- depreciation posting logic belongs to the future Finance module.

create table public.equipment_depreciation_policies (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.equipment_items (id),
  purchase_cost numeric(14, 2) not null check (purchase_cost >= 0),
  purchase_currency text not null references public.currencies (code),
  salvage_value numeric(14, 2) not null default 0 check (salvage_value >= 0),
  salvage_currency text not null references public.currencies (code),
  useful_life_months integer not null check (useful_life_months > 0),
  method text not null default 'straight_line' check (method in ('straight_line', 'declining_balance', 'none')),
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.equipment_depreciation_policies is
  'Depreciation INPUTS only (purchase cost, salvage value, useful life, method) — one per item. No computed schedule or posting logic here; that is the Finance module''s job.';

create index equipment_depreciation_policies_purchase_currency_idx on public.equipment_depreciation_policies (purchase_currency);
create index equipment_depreciation_policies_salvage_currency_idx on public.equipment_depreciation_policies (salvage_currency);
create index equipment_depreciation_policies_created_by_idx on public.equipment_depreciation_policies (created_by);
create index equipment_depreciation_policies_updated_by_idx on public.equipment_depreciation_policies (updated_by);
create index equipment_depreciation_policies_deleted_by_idx on public.equipment_depreciation_policies (deleted_by);

create trigger set_equipment_depreciation_policies_updated_at
  before update on public.equipment_depreciation_policies
  for each row
  execute function public.set_updated_at();

create table public.equipment_item_valuations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items (id),
  entry_date date not null default current_date,
  entry_type text not null check (entry_type in ('purchase', 'appraisal', 'writeoff', 'disposal')),
  amount numeric(14, 2) not null,
  currency_code text not null references public.currencies (code),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

comment on table public.equipment_item_valuations is
  'Append-only value history per item (purchase price at intake, manual appraisals, write-offs/disposal). Deliberately excludes a "depreciation" entry type for now — the Finance module adds that when it starts posting computed entries here.';

create index equipment_item_valuations_item_id_idx on public.equipment_item_valuations (item_id);
create index equipment_item_valuations_currency_code_idx on public.equipment_item_valuations (currency_code);
create index equipment_item_valuations_created_by_idx on public.equipment_item_valuations (created_by);

alter table public.equipment_depreciation_policies enable row level security;
alter table public.equipment_item_valuations enable row level security;

create policy "equipment_depreciation_policies_select_financials"
  on public.equipment_depreciation_policies for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.financials.view'));

create policy "equipment_depreciation_policies_insert_managers"
  on public.equipment_depreciation_policies for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_depreciation_policies_update_managers"
  on public.equipment_depreciation_policies for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_depreciation_policies_delete_managers"
  on public.equipment_depreciation_policies for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_item_valuations_select_financials"
  on public.equipment_item_valuations for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.financials.view'));

create policy "equipment_item_valuations_insert_managers"
  on public.equipment_item_valuations for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));
