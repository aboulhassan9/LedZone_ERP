// The equipment lifecycle state machine's application-layer half — mirrors
// supabase/migrations/0045_equipment_status_state_machine.sql's
// equipment_status_transitions table row for row. Requested during Module 3.5 review:
// EquipmentLifecycleService (modules/inventory/services/equipment-item-service.ts) is the
// single source of truth for legal transitions, checked here for a fast, friendly error
// before ever reaching the database — but the database is the final authority and
// re-validates independently (assert_equipment_status_transition()) since its RPCs are
// callable directly via Supabase's API and must not trust this check alone.
//
// If you add or remove an edge here, make the matching change in 0045's seed data (a new
// migration — 0045 is already applied, never edit an applied migration in place).

export type EquipmentStatus =
  | "available"
  | "reserved"
  | "picked"
  | "in_transit"
  | "on_site"
  | "returned"
  | "inspection"
  | "quarantined"
  | "in_maintenance"
  | "in_use"
  | "scrapped"
  | "lost";

const TRANSITIONS: Record<EquipmentStatus, EquipmentStatus[]> = {
  available: ["in_use", "reserved", "picked", "in_transit", "quarantined", "lost", "scrapped"],
  reserved: ["available", "picked", "in_transit", "quarantined", "lost", "scrapped"],
  picked: ["in_transit", "quarantined", "lost", "scrapped"],
  in_transit: ["on_site", "returned", "quarantined", "lost", "scrapped"],
  on_site: ["returned", "quarantined", "lost", "scrapped"],
  returned: ["inspection", "quarantined", "lost", "scrapped"],
  inspection: ["available", "quarantined", "lost", "scrapped"],
  quarantined: ["in_maintenance", "lost", "scrapped"],
  in_maintenance: ["available", "quarantined", "lost", "scrapped"],
  in_use: ["available", "quarantined", "lost", "scrapped"],
  scrapped: [],
  lost: ["scrapped"],
};

// Pure edge check — mirrors the database's is_valid_equipment_status_transition() exactly,
// including that a same-status no-op is always "valid" here. Blocking all operations on an
// already-scrapped item is handled separately by assertEquipmentStatusTransition below (the
// database splits this the same way, between is_valid_equipment_status_transition() and
// assert_equipment_status_transition()).
export function isValidEquipmentStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return (TRANSITIONS[from as EquipmentStatus] ?? []).includes(to as EquipmentStatus);
}

// Throws (via the caller-supplied error constructor, so each module can raise its own
// error hierarchy's ConflictError) unless the transition is legal and the item isn't
// scrapped.
export function assertEquipmentStatusTransition(
  from: string,
  to: string,
  makeError: (message: string) => Error
): void {
  if (from === "scrapped") {
    throw makeError("This item is scrapped — no further operations are permitted.");
  }
  if (!isValidEquipmentStatusTransition(from, to)) {
    throw makeError(`Illegal equipment status transition: "${from}" -> "${to}".`);
  }
}
