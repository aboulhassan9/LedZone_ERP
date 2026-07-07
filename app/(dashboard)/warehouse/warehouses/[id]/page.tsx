import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import { WarehouseEditButton } from "@/modules/warehouse/components/warehouses/warehouse-edit-button";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

const WAREHOUSE_COLUMNS =
  "id, location_id, name, code, description, warehouse_type, address, gps_lat, gps_lng, manager_id, contact_phone, contact_email, capacity_volume_m3, capacity_weight_kg, is_default, is_active, status";

export default async function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("warehouse.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: warehouse } = await supabase
    .from("warehouses")
    .select(WAREHOUSE_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!warehouse) notFound();
  const warehouseRow = warehouse as WarehouseRow;

  const [{ data: locations }, { data: profiles }, { data: manager }, { data: capacity }, canManage] =
    await Promise.all([
      supabase.from("locations").select("id, name").is("deleted_at", null).order("name"),
      supabase.from("profiles").select("id, full_name").order("full_name"),
      warehouseRow.manager_id
        ? supabase.from("profiles").select("full_name").eq("id", warehouseRow.manager_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("warehouse_capacity_summary")
        .select("bin_count, occupied_bin_count, empty_bin_count, total_equipment_count, total_consumable_qty")
        .eq("warehouse_id", id)
        .maybeSingle(),
      hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.update")),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            {warehouseRow.name}
            <WarehouseStatusBadge status={warehouseRow.status} />
          </h1>
          <p className="text-muted-foreground text-sm">
            {warehouseRow.code} — {warehouseRow.warehouse_type.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/warehouse/locations?warehouseId=${id}`}>Open location explorer</Link>
          </Button>
          {canManage && (
            <WarehouseEditButton warehouse={warehouseRow} locations={locations ?? []} profiles={profiles ?? []} />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Manager</dt>
                <dd className="font-medium">{manager?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="font-medium">{warehouseRow.contact_phone ?? warehouseRow.contact_email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Address</dt>
                <dd className="font-medium">{warehouseRow.address ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">GPS</dt>
                <dd className="font-medium">
                  {warehouseRow.gps_lat != null && warehouseRow.gps_lng != null
                    ? `${warehouseRow.gps_lat}, ${warehouseRow.gps_lng}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Declared capacity</dt>
                <dd className="font-medium">
                  {warehouseRow.capacity_volume_m3 ? `${warehouseRow.capacity_volume_m3} m³` : "—"}
                  {warehouseRow.capacity_weight_kg ? ` / ${warehouseRow.capacity_weight_kg} kg` : ""}
                </dd>
              </div>
            </dl>
            {warehouseRow.description && (
              <p className="text-muted-foreground mt-4 text-sm">{warehouseRow.description}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Occupancy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bins</span>
              <span className="font-medium">
                {capacity?.occupied_bin_count ?? 0} / {capacity?.bin_count ?? 0} occupied
              </span>
            </div>
            <Progress
              value={
                capacity?.bin_count ? ((capacity.occupied_bin_count ?? 0) / capacity.bin_count) * 100 : 0
              }
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Equipment units</span>
              <span className="font-medium">{capacity?.total_equipment_count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Consumable quantity</span>
              <span className="font-medium">{capacity?.total_consumable_qty ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Empty bins</span>
              <span className="font-medium">{capacity?.empty_bin_count ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
