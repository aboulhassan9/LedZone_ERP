-- 0064_link_customer_id_to_planning: same "additive-FK-later, promise kept" as 0063, for the
-- other placeholder field equipment_plans carried (customer_reference, from 0049, predating
-- Module 5/CRM). equipment_plans has zero rows (already confirmed for 0063) -- clean
-- drop-and-replace.

alter table public.equipment_plans
  drop column customer_reference,
  add column customer_id uuid references public.customers (id);

create index equipment_plans_customer_id_idx on public.equipment_plans (customer_id);
