-- 0063_link_events_to_planning_and_crm: the additive-FK-later promise, kept. Both
-- equipment_plans.event_reference (0049) and quotes.event_reference (0058) were explicitly
-- documented as free text pending a real Events table -- it now exists (0061). Both tables
-- have zero rows in production (confirmed before this migration), so this is a clean
-- drop-and-replace, not a backfill.

alter table public.equipment_plans
  drop column event_reference,
  add column event_id uuid references public.events (id);

create index equipment_plans_event_id_idx on public.equipment_plans (event_id);

alter table public.quotes
  drop column event_reference,
  add column event_id uuid references public.events (id);

create index quotes_event_id_idx on public.quotes (event_id);
