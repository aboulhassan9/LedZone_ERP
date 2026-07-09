import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function WarehouseDashboardPage() {
  await requirePermission("warehouse.view");

  const supabase = await createClient();

  const [
    warehousesResult,
    locationsResult,
    availableResult,
    reservedResult,
    inTransitResult,
    transfersResult,
    receivingResult,
    dispatchResult,
    scheduledResult,
    inProgressResult,
    pendingApprovalResult,
    { data: countedLineStats },
  ] = await Promise.all([
    supabase.from("warehouses").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("warehouse_locations")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_placeable", true)
      .eq("status", "active"),
    supabase.from("equipment_items").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("current_status", "available"),
    supabase.from("equipment_items").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("current_status", "reserved"),
    // Dispatched equipment (complete_warehouse_dispatch_line sets current_status =
    // 'in_transit') — a direct, authoritative read now that the status exists on the item
    // itself, rather than the previous proxy via warehouse_transfer_lines.status.
    supabase.from("equipment_items").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("current_status", "in_transit"),
    supabase.from("warehouse_transfers").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("warehouse_receiving_records").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "pending"),
    supabase.from("warehouse_dispatch_records").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "pending"),
    supabase.from("warehouse_cycle_counts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("warehouse_cycle_counts").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("warehouse_cycle_counts").select("*", { count: "exact", head: true }).eq("status", "pending_approval"),
    supabase
      .from("warehouse_cycle_count_lines")
      .select("counted_qty, cycle_count_id, warehouse_cycle_counts!inner(status)")
      .in("warehouse_cycle_counts.status", ["in_progress", "pending_approval"]),
  ]);

  const activeCountLines = countedLineStats ?? [];
  const countedLines = activeCountLines.filter((l) => l.counted_qty != null).length;
  const countProgress = activeCountLines.length ? Math.round((countedLines / activeCountLines.length) * 100) : 0;

  const kpis = [
    { label: "Total warehouses", value: warehousesResult.count ?? 0, href: "/warehouse/warehouses" },
    { label: "Active locations", value: locationsResult.count ?? 0, href: "/warehouse/locations" },
    { label: "Equipment available", value: availableResult.count ?? 0, href: "/warehouse/reservations" },
    { label: "Equipment reserved", value: reservedResult.count ?? 0, href: "/warehouse/reservations" },
    { label: "Equipment in transit", value: inTransitResult.count ?? 0, href: "/warehouse/dispatch" },
    { label: "Pending transfers", value: transfersResult.count ?? 0, href: "/warehouse/transfers" },
    { label: "Pending receiving", value: receivingResult.count ?? 0, href: "/warehouse/receiving" },
    { label: "Pending dispatch", value: dispatchResult.count ?? 0, href: "/warehouse/dispatch" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Warehouse dashboard</h1>
        <p className="text-muted-foreground text-sm">Live snapshot of warehouse operations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-normal">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{kpi.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cycle count progress</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Scheduled</dt>
              <dd className="text-xl font-semibold">{scheduledResult.count ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">In progress</dt>
              <dd className="text-xl font-semibold">{inProgressResult.count ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pending approval</dt>
              <dd className="text-xl font-semibold">{pendingApprovalResult.count ?? 0}</dd>
            </div>
          </dl>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lines counted (active counts)</span>
            <span className="font-medium">
              {countedLines} / {activeCountLines.length} ({countProgress}%)
            </span>
          </div>
          <Progress value={countProgress} />
        </CardContent>
      </Card>
    </div>
  );
}
