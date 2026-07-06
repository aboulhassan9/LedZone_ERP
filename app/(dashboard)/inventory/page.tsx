import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline, type TimelineEntry } from "@/modules/inventory/components/timeline";

const ITEM_STATUSES = [
  "available",
  "reserved",
  "in_use",
  "in_maintenance",
  "damaged",
  "lost",
  "retired",
] as const;

export default async function InventoryDashboardPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();

  const [{ data: items }, { data: lowStock }, { data: logs }, { data: profiles }] = await Promise.all([
    supabase.from("equipment_items").select("current_status").is("deleted_at", null),
    supabase
      .from("consumable_stock_levels")
      .select("id, quantity_on_hand, reorder_threshold")
      .not("reorder_threshold", "is", null),
    supabase
      .from("audit_logs")
      .select("id, actor_id, action, entity_type, entity_id, created_at")
      .or("entity_type.ilike.equipment%,entity_type.ilike.consumable%")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const counts = new Map<string, number>();
  for (const row of items ?? []) {
    counts.set(row.current_status, (counts.get(row.current_status) ?? 0) + 1);
  }
  const total = items?.length ?? 0;
  const lowStockCount = (lowStock ?? []).filter(
    (r) => r.reorder_threshold != null && r.quantity_on_hand <= r.reorder_threshold
  ).length;

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const entries: TimelineEntry[] = (logs ?? []).map((log) => ({
    id: log.id,
    title: log.action.replace(/[._]/g, " "),
    description: `${nameById.get(log.actor_id ?? "") ?? "System"} — ${log.entity_type}`,
    timestamp: log.created_at,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          A live snapshot of LED Zone&apos;s equipment fleet.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total items</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{total}</CardContent>
        </Card>
        {ITEM_STATUSES.slice(0, 3).map((status) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium capitalize">
                {status.replace(/_/g, " ")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{counts.get(status) ?? 0}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {ITEM_STATUSES.slice(3).map((status) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium capitalize">
                {status.replace(/_/g, " ")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{counts.get(status) ?? 0}</CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              <Link href="/inventory/consumables" className="hover:underline">
                Low stock consumables
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{lowStockCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
