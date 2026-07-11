import "server-only";
import { createClient } from "@/lib/supabase/server";

// Mirrors modules/crm/shared/audit.ts exactly.
export async function logReportsAudit(
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
