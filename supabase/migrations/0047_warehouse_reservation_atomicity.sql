-- 0047_warehouse_reservation_atomicity: requested during Module 3.5 review. The "does this
-- item already have an active reservation" check was a check-then-insert in application
-- code (findActiveForItem, then reject if non-empty) — two concurrent requests for the
-- same item could both pass the check before either INSERT committed. This closes the
-- race with a partial unique index (the only mechanism Postgres offers that's actually
-- atomic across concurrent transactions for "at most one row matching X") plus a
-- dedicated RPC that auto-releases genuinely expired reservations before inserting, so
-- the fix doesn't regress the existing "an expired reservation doesn't block a new one"
-- behavior.

-- At most one *active* (unreleased) reservation per item at a time. Expiry is handled by
-- create_warehouse_reservation() auto-releasing expired rows before it inserts, not by
-- this index (a partial index predicate can't reference now()).
create unique index warehouse_reservations_active_item_uq
  on public.warehouse_reservations (item_id)
  where released_at is null and item_id is not null;

create or replace function public.create_warehouse_reservation(
  p_warehouse_location_id uuid default null,
  p_item_id uuid default null,
  p_reserved_for_type text default null,
  p_expires_at timestamptz default null,
  p_reference_note text default null
)
returns public.warehouse_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.warehouse_reservations;
begin
  if not (
    public.has_permission(auth.uid(), 'warehouse.manage')
    or public.has_permission(auth.uid(), 'warehouse.location.manage')
  ) then
    raise exception 'Permission denied to create warehouse reservations';
  end if;

  if (p_warehouse_location_id is null) = (p_item_id is null) then
    raise exception 'Set exactly one of p_warehouse_location_id or p_item_id';
  end if;

  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'p_expires_at must be in the future';
  end if;

  -- Auto-release this item's own expired-but-unreleased reservations first, so an
  -- expired reservation never blocks a new one (matches the read-time filtering the
  -- application previously relied on) while the unique index below still atomically
  -- rejects a genuinely active conflict.
  if p_item_id is not null then
    update public.warehouse_reservations
    set released_at = now()
    where item_id = p_item_id and released_at is null and expires_at <= now();
  end if;

  begin
    insert into public.warehouse_reservations (
      warehouse_location_id, item_id, reserved_for_type, reserved_by, expires_at, reference_note
    ) values (
      p_warehouse_location_id, p_item_id, p_reserved_for_type, auth.uid(), p_expires_at, p_reference_note
    )
    returning * into v_reservation;
  exception
    when unique_violation then
      raise exception 'This item already has an active reservation.' using errcode = '23505';
  end;

  return v_reservation;
end;
$$;

comment on function public.create_warehouse_reservation is
  'Atomically creates a warehouse reservation: auto-releases the item''s own expired reservations, then inserts, relying on warehouse_reservations_active_item_uq to reject a genuine concurrent conflict with a friendly message. The sole path that should insert into warehouse_reservations for an item-scoped reservation.';

revoke execute on function public.create_warehouse_reservation(uuid, uuid, text, timestamptz, text) from anon, public;
grant execute on function public.create_warehouse_reservation(uuid, uuid, text, timestamptz, text) to authenticated;
