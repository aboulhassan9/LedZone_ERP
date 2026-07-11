import "server-only";
import { createClient } from "@/lib/supabase/server";

// Every mutation in the Warehouse Service Layer calls this after a successful write,
// reusing Module 1's generic log_audit_event() — no warehouse-specific audit table. Mirrors
// modules/inventory/shared/audit.ts exactly.
export async function logWarehouseAudit(
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("log_audit_event", {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_changes: changes,
  });
}
