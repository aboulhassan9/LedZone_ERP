-- 0045_equipment_status_state_machine: requested during Module 3.5 review. Every
-- current_status-mutating operation (across both Inventory and Warehouse) previously
-- validated permission only, never the legality of the transition itself, and nothing
-- stopped an operation on an already-scrapped item. This introduces an explicit,
-- data-driven state machine as the single source of truth for legal transitions,
-- enforced here at the database/RPC layer (0046 wires it into every existing RPC) and
-- mirrored in modules/inventory/lifecycle/equipment-status-transitions.ts for the
-- application layer — both are required per the review decision ("RPCs ... should not
-- trust the client").
--
-- Vocabulary change (safe: equipment_items has zero rows at time of writing):
--   - 'damaged' is dropped as a *status* value. It stays a current_condition value (the
--     table's own original comment already says status/condition are independent axes;
--     using 'damaged' as a status was an inconsistency this cleans up). Both the
--     Inventory damage-report flow and the Warehouse quarantine flow now target the same
--     status: 'quarantined'.
--   - 'retired' is renamed to 'scrapped', matching the terminology used throughout this
--     review. Meaning is unchanged: terminal, no further transitions.
--   - New: 'picked', 'in_transit', 'on_site', 'returned', 'inspection', 'quarantined'.
--   - Unchanged: 'available', 'reserved', 'in_maintenance', 'in_use', 'lost'.

alter table public.equipment_items drop constraint equipment_items_current_status_check;

alter table public.equipment_items add constraint equipment_items_current_status_check check (
  current_status in (
    'available', 'reserved', 'picked', 'in_transit', 'on_site', 'returned', 'inspection',
    'quarantined', 'in_maintenance', 'in_use', 'scrapped', 'lost'
  )
);

alter table public.equipment_items alter column current_status set default 'available';

-- The explicit state machine. Every (from_status, to_status) pair here is a legal
-- transition; anything not listed is rejected. Same-status "transitions" (a no-op) are
-- always legal and are not listed here — is_valid_equipment_status_transition() handles
-- that case directly rather than duplicating every status as a row pointing at itself.
create table public.equipment_status_transitions (
  from_status text not null,
  to_status text not null,
  primary key (from_status, to_status)
);

comment on table public.equipment_status_transitions is
  'Reference data: the explicit equipment lifecycle state machine. Read by is_valid_equipment_status_transition() / assert_equipment_status_transition(), which every status-mutating RPC calls before writing equipment_items.current_status. Not modified by the application — only by future migrations.';

insert into public.equipment_status_transitions (from_status, to_status) values
  -- Internal checkout/checkin (Module 2's lightweight loan flow).
  ('available', 'in_use'),
  ('in_use', 'available'),

  -- Reservation.
  ('available', 'reserved'),
  ('reserved', 'available'),

  -- Event/rental pipeline: Reserved -> Picked -> In Transit -> On Site -> Returned ->
  -- Inspection -> Available. Picking/dispatch don't strictly require a prior reservation
  -- in this app, so available can also feed picked/in_transit directly.
  ('reserved', 'picked'),
  ('available', 'picked'),
  ('picked', 'in_transit'),
  ('available', 'in_transit'),
  ('reserved', 'in_transit'),
  ('in_transit', 'on_site'),
  ('in_transit', 'returned'),
  ('on_site', 'returned'),
  ('returned', 'inspection'),
  ('inspection', 'available'),
  ('inspection', 'quarantined'),

  -- Quarantine -> Maintenance -> Available.
  ('quarantined', 'in_maintenance'),
  ('in_maintenance', 'available'),

  -- Quarantine can be entered from any active state — damage can be discovered at any
  -- point, not only during a formal inspection.
  ('available', 'quarantined'),
  ('reserved', 'quarantined'),
  ('picked', 'quarantined'),
  ('in_transit', 'quarantined'),
  ('on_site', 'quarantined'),
  ('returned', 'quarantined'),
  ('in_maintenance', 'quarantined'),
  ('in_use', 'quarantined'),

  -- Lost can be reported from any active state.
  ('available', 'lost'),
  ('reserved', 'lost'),
  ('picked', 'lost'),
  ('in_transit', 'lost'),
  ('on_site', 'lost'),
  ('returned', 'lost'),
  ('inspection', 'lost'),
  ('quarantined', 'lost'),
  ('in_maintenance', 'lost'),
  ('in_use', 'lost'),

  -- Any non-terminal state -> Scrapped. Scrapped itself has no outgoing rows: it is
  -- terminal by construction (absence from this table, not a special-cased flag).
  ('available', 'scrapped'),
  ('reserved', 'scrapped'),
  ('picked', 'scrapped'),
  ('in_transit', 'scrapped'),
  ('on_site', 'scrapped'),
  ('returned', 'scrapped'),
  ('inspection', 'scrapped'),
  ('quarantined', 'scrapped'),
  ('in_maintenance', 'scrapped'),
  ('in_use', 'scrapped'),
  ('lost', 'scrapped');

alter table public.equipment_status_transitions enable row level security;

create policy "equipment_status_transitions_select_authenticated"
  on public.equipment_status_transitions for select
  to authenticated
  using (true);

create or replace function public.is_valid_equipment_status_transition(p_from text, p_to text)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_from = p_to or exists (
    select 1 from public.equipment_status_transitions
    where from_status = p_from and to_status = p_to
  );
$$;

comment on function public.is_valid_equipment_status_transition is
  'True if p_to is a legal next status from p_from (or they''re equal — a no-op is always legal). The single source of truth for equipment lifecycle legality.';

-- The guard every status-mutating RPC calls before its own UPDATE. Locks the item's row
-- (FOR UPDATE) so two concurrent operations on the *same* item serialize instead of both
-- reading a stale current_status and both deciding their transition is legal.
create or replace function public.assert_equipment_status_transition(p_item_id uuid, p_to_status text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_current_status text;
begin
  select current_status into v_current_status
  from public.equipment_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  if v_current_status = 'scrapped' then
    raise exception 'Item % is scrapped — no further operations are permitted.', p_item_id;
  end if;

  if not public.is_valid_equipment_status_transition(v_current_status, p_to_status) then
    raise exception 'Illegal equipment status transition for item %: % -> %', p_item_id, v_current_status, p_to_status;
  end if;
end;
$$;

comment on function public.assert_equipment_status_transition is
  'Raises unless (current_status -> p_to_status) is a legal transition (or a no-op) and the item isn''t scrapped. Called by every RPC that writes equipment_items.current_status, immediately before that write, inside the same transaction.';

revoke execute on function public.assert_equipment_status_transition(uuid, text) from anon, public;
grant execute on function public.assert_equipment_status_transition(uuid, text) to authenticated;
