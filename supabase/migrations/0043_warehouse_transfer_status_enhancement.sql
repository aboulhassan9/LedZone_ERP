-- 0043_warehouse_transfer_status_enhancement: requested after Module 3.2 review. Replaces
-- warehouse_transfers' 5-value status list (pending|approved|in_transit|completed|cancelled)
-- with the full requested lifecycle: draft|submitted|approved|in_transit|rejected|
-- cancelled|completed|failed. Safe to rename rather than purely append, since zero rows
-- exist in this table yet (confirmed before writing this migration) — 'pending' becomes
-- 'submitted' (same meaning: submitted, awaiting approval), and the column default moves
-- from 'pending' to 'draft' so a transfer now starts unsubmitted, matching the UI's
-- explicit "Submit" action. 'rejected' and 'failed' are genuinely new terminal states,
-- distinguished from 'cancelled' instead of collapsing into it as the Module 3.2 Service
-- Layer temporarily did.

alter table public.warehouse_transfers
  alter column status set default 'draft';

alter table public.warehouse_transfers
  drop constraint warehouse_transfers_status_check;

alter table public.warehouse_transfers
  add constraint warehouse_transfers_status_check check (
    status in ('draft', 'submitted', 'approved', 'in_transit', 'rejected', 'cancelled', 'completed', 'failed')
  );

-- approve_warehouse_transfer now approves from 'submitted' (was 'pending').
create or replace function public.approve_warehouse_transfer(p_transfer_id uuid)
returns public.warehouse_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer public.warehouse_transfers;
begin
  if not (
    public.has_permission(auth.uid(), 'warehouse.manage')
    or public.has_permission(auth.uid(), 'warehouse.approve')
  ) then
    raise exception 'Permission denied to approve warehouse transfers';
  end if;

  update public.warehouse_transfers
  set status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_by = auth.uid()
  where id = p_transfer_id and status = 'submitted'
  returning * into v_transfer;

  if not found then
    raise exception 'Transfer % is not submitted (or does not exist)', p_transfer_id;
  end if;

  return v_transfer;
end;
$$;

comment on function public.approve_warehouse_transfer is
  'Transitions a transfer from submitted to approved. SECURITY DEFINER so a warehouse.approve-only holder can update warehouse_transfers despite its blanket UPDATE policy also requiring warehouse.manage/transfer for ordinary edits — this function checks the approval permission specifically.';
