import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { AuditLogTable, type AuditLogRow } from "@/modules/audit/components/audit-log-table";

export default async function AuditLogPage() {
  await requirePermission("audit.view");

  const supabase = await createClient();
  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, actor_id, action, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const rows: AuditLogRow[] = (logs ?? []).map((row) => ({
    id: row.id,
    actorName: row.actor_id ? (nameById.get(row.actor_id) ?? null) : null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground text-sm">
          Every sensitive action taken across LED Zone ERP.
        </p>
      </div>
      <AuditLogTable rows={rows} />
    </div>
  );
}
