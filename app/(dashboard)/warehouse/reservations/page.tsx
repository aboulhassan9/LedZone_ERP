import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReservationCreateDialog } from "@/modules/warehouse/components/reservations/reservation-create-dialog";
import { ReservationListClient } from "@/modules/warehouse/components/reservations/reservation-list-client";
import type { WarehouseReservationRow } from "@/modules/warehouse/repositories/warehouse-reservation-repository";

const RESERVATION_COLUMNS =
  "id, warehouse_location_id, item_id, reserved_for_type, reserved_by, reserved_at, expires_at, released_at, reference_note";

export default async function ReservationsPage() {
  await requirePermission("warehouse.view");

  const supabase = await createClient();
  const [{ data: reservations }, { data: allItems }, { data: availableItems }, { data: locations }, canManage] =
    await Promise.all([
      supabase.from("warehouse_reservations").select(RESERVATION_COLUMNS).order("reserved_at", { ascending: false }),
      supabase.from("equipment_items").select("id, asset_tag, current_status").is("deleted_at", null),
      supabase.from("equipment_items").select("id, asset_tag").is("deleted_at", null).eq("current_status", "available"),
      supabase.from("warehouse_locations").select("id, full_code").is("deleted_at", null).eq("is_placeable", true),
      hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.location.manage")),
    ]);

  const reservationRows = (reservations ?? []) as WarehouseReservationRow[];
  const itemLabels = Object.fromEntries((allItems ?? []).map((i) => [i.id, i.asset_tag]));
  const locationCodes = Object.fromEntries((locations ?? []).map((l) => [l.id, l.full_code ?? l.id]));

  const availabilityCounts = (allItems ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.current_status] = (acc[item.current_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground text-sm">Hold items or bins so they can&apos;t be double-booked.</p>
        </div>
        {canManage && (
          <ReservationCreateDialog
            items={(availableItems ?? []).map((i) => ({ id: i.id, label: i.asset_tag }))}
            locations={(locations ?? []).map((l) => ({ id: l.id, label: l.full_code ?? l.id }))}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipment availability</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            {Object.entries(availabilityCounts).map(([status, count]) => (
              <div key={status}>
                <dt className="text-muted-foreground capitalize">{status.replace(/_/g, " ")}</dt>
                <dd className="text-xl font-semibold">{count}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationListClient
            reservations={reservationRows}
            itemLabels={itemLabels}
            locationCodes={locationCodes}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
