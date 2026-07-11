-- 0075_hr_leave_payroll_performance: Module 10 (HR) leave requests, payroll records, and
-- performance reviews -- all new, no existing table covers any of this ground
-- (resource_assignments only records booking windows against a plan, never HR events).

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid not null references public.crew_members (id),
  leave_type text not null check (
    leave_type in ('annual', 'sick', 'unpaid', 'other')
  ),
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'cancelled')
  ),
  reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  constraint leave_requests_window check (end_date >= start_date)
);

comment on table public.leave_requests is
  'A crew member''s leave request -- pending -> approved/rejected, cancellable while pending.';

create index leave_requests_crew_member_id_idx on public.leave_requests (crew_member_id);
create index leave_requests_status_idx on public.leave_requests (status);
create index leave_requests_created_by_idx on public.leave_requests (created_by);
create index leave_requests_updated_by_idx on public.leave_requests (updated_by);

create trigger set_leave_requests_updated_at
  before update on public.leave_requests
  for each row
  execute function public.set_updated_at();

create table public.payroll_records (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid not null references public.crew_members (id),
  pay_period_start date not null,
  pay_period_end date not null,
  gross_amount numeric(14, 2) not null check (gross_amount >= 0),
  deductions numeric(14, 2) not null default 0 check (deductions >= 0),
  net_amount numeric(14, 2) not null check (net_amount >= 0),
  currency_code text not null references public.currencies (code),
  status text not null default 'draft' check (
    status in ('draft', 'approved', 'paid')
  ),
  payment_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  constraint payroll_records_period check (pay_period_end >= pay_period_start)
);

comment on table public.payroll_records is
  'One pay-period record per crew member -- draft -> approved -> paid.';

create index payroll_records_crew_member_id_idx on public.payroll_records (crew_member_id);
create index payroll_records_status_idx on public.payroll_records (status);
create index payroll_records_currency_code_idx on public.payroll_records (currency_code);
create index payroll_records_created_by_idx on public.payroll_records (created_by);
create index payroll_records_updated_by_idx on public.payroll_records (updated_by);

create trigger set_payroll_records_updated_at
  before update on public.payroll_records
  for each row
  execute function public.set_updated_at();

create table public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid not null references public.crew_members (id),
  review_date date not null default current_date,
  reviewer_id uuid references public.profiles (id),
  rating integer check (rating between 1 and 5),
  comments text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

comment on table public.performance_reviews is
  'Append-only performance review record for a crew member -- same pattern as vehicle_maintenance_records without the update path (a review is a point-in-time record, not an editable one).';

create index performance_reviews_crew_member_id_idx on public.performance_reviews (crew_member_id);
create index performance_reviews_review_date_idx on public.performance_reviews (review_date);
create index performance_reviews_reviewer_id_idx on public.performance_reviews (reviewer_id);
create index performance_reviews_created_by_idx on public.performance_reviews (created_by);

alter table public.leave_requests enable row level security;
alter table public.payroll_records enable row level security;
alter table public.performance_reviews enable row level security;

create policy "leave_requests_select_viewers"
  on public.leave_requests for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'hr.view'));

create policy "leave_requests_insert_managers"
  on public.leave_requests for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'hr.manage'));

create policy "leave_requests_update_managers"
  on public.leave_requests for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'hr.manage'))
  with check (public.has_permission((select auth.uid()), 'hr.manage'));

create policy "payroll_records_select_viewers"
  on public.payroll_records for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'hr.view'));

create policy "payroll_records_insert_managers"
  on public.payroll_records for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'hr.payroll.manage'));

create policy "payroll_records_update_managers"
  on public.payroll_records for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'hr.payroll.manage'))
  with check (public.has_permission((select auth.uid()), 'hr.payroll.manage'));

create policy "performance_reviews_select_viewers"
  on public.performance_reviews for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'hr.view'));

create policy "performance_reviews_insert_managers"
  on public.performance_reviews for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'hr.manage'));

-- HR also needs to write the HR-specific columns added to `crew_members` in 0074
-- (hr_status, employment info, salary). Planning's existing crew_members_update_managers
-- policy (0050) already permits planning.manage/planning.assign.crew to update the row; this
-- adds hr.manage as an equally valid path for the same UPDATE, without touching Planning's
-- existing policy (same pattern as Fleet's vehicles_update_fleet_managers, 0072).
create policy "crew_members_update_hr_managers"
  on public.crew_members for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'hr.manage'))
  with check (public.has_permission((select auth.uid()), 'hr.manage'));
