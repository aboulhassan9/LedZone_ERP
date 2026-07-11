-- 0074_hr_employee_extension: Module 10 (HR) absorbs the `crew_members` table Planning's 0050
-- migration deliberately left minimal ("Expected to be replaced/absorbed by a future HR/Crew
-- module") -- same pattern as Module 9 (Fleet) absorbing `vehicles`. Additive columns only --
-- Planning's existing full_name/role/phone/email/is_active fields and its own
-- crew-form-dialog UI are untouched (basic directory identity, used for resource_assignments
-- booking). `hr_status` is intentionally a separate column from `is_active`, same reasoning as
-- Fleet's `fleet_status`: is_active is Planning's simple "bookable at all" toggle; hr_status is
-- the employee's own HR lifecycle, owned and written by this module. Confirmed zero existing
-- rows before this migration.

alter table public.crew_members
  add column employee_number text,
  add column hire_date date,
  add column employment_type text check (employment_type in ('full_time', 'part_time', 'contractor')),
  add column base_salary numeric(14, 2) check (base_salary >= 0),
  add column salary_currency_code text references public.currencies (code),
  add column hr_status text not null default 'active' check (
    hr_status in ('active', 'on_leave', 'terminated')
  ),
  add column termination_date date,
  add column notes text;

comment on column public.crew_members.hr_status is
  'The employee''s own HR lifecycle, owned by Module 10 (HR) -- distinct from is_active, which is Planning''s simple bookable/not-bookable toggle.';

create index crew_members_hr_status_idx on public.crew_members (hr_status);
create index crew_members_salary_currency_code_idx on public.crew_members (salary_currency_code);
