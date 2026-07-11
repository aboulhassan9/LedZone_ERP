-- 0057_crm_customers: Module 5 (CRM). Customers unify what many CRMs split into "lead" and
-- "customer" — a single lifecycle_stage column (lead -> prospect -> active -> inactive) avoids
-- an awkward lead-to-customer conversion migration. customer_contacts is a detail table (people
-- at a customer), not a soft-deleted aggregate root, so it skips deleted_at/deleted_by.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_type text not null default 'company' check (customer_type in ('company', 'individual')),
  lifecycle_stage text not null default 'lead' check (
    lifecycle_stage in ('lead', 'prospect', 'active', 'inactive')
  ),
  company_name text,
  full_name text,
  email text,
  phone text,
  billing_address text,
  tax_id text,
  source text check (source in ('referral', 'website', 'social', 'repeat', 'walk_in', 'other')),
  assigned_to uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint customers_name_required check (
    (customer_type = 'company' and company_name is not null)
    or (customer_type = 'individual' and full_name is not null)
  )
);

comment on table public.customers is
  'A company or individual client, at any point from first inquiry (lifecycle_stage = lead) through an active relationship. No separate leads table -- see migration comment.';

create index customers_lifecycle_stage_idx on public.customers (lifecycle_stage);
create index customers_customer_type_idx on public.customers (customer_type);
create index customers_assigned_to_idx on public.customers (assigned_to);
create index customers_created_by_idx on public.customers (created_by);
create index customers_updated_by_idx on public.customers (updated_by);
create index customers_deleted_by_idx on public.customers (deleted_by);

create trigger set_customers_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  full_name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

comment on table public.customer_contacts is
  'People at a customer (not itself a customer). At most one primary contact per customer.';

create unique index customer_contacts_primary_uq on public.customer_contacts (customer_id) where is_primary;
create index customer_contacts_customer_id_idx on public.customer_contacts (customer_id);
create index customer_contacts_created_by_idx on public.customer_contacts (created_by);
create index customer_contacts_updated_by_idx on public.customer_contacts (updated_by);

create trigger set_customer_contacts_updated_at
  before update on public.customer_contacts
  for each row
  execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;

create policy "customers_select_viewers"
  on public.customers for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'crm.view'));

create policy "customers_insert_managers"
  on public.customers for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.create')
  );

create policy "customers_update_managers"
  on public.customers for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.update')
    or public.has_permission((select auth.uid()), 'crm.delete')
  )
  with check (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.update')
    or public.has_permission((select auth.uid()), 'crm.delete')
  );

create policy "customer_contacts_select_viewers"
  on public.customer_contacts for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'crm.view'));

create policy "customer_contacts_insert_managers"
  on public.customer_contacts for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.create')
    or public.has_permission((select auth.uid()), 'crm.update')
  );

create policy "customer_contacts_update_managers"
  on public.customer_contacts for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.update')
  )
  with check (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.update')
  );

create policy "customer_contacts_delete_managers"
  on public.customer_contacts for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'crm.manage')
    or public.has_permission((select auth.uid()), 'crm.update')
  );
