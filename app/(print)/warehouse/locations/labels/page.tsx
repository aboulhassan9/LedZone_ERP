import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/modules/warehouse/components/locations/print-button";

export default async function BatchLocationLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouseId?: string }>;
}) {
  await requirePermission("warehouse.view");
  const { warehouseId } = await searchParams;
  const canPrint = (await hasPermission("warehouse.manage")) || (await hasPermission("warehouse.labels"));

  if (!warehouseId) {
    return <p className="text-muted-foreground text-sm">No warehouse selected.</p>;
  }

  const supabase = await createClient();
  const [{ data: warehouse }, { data: locations }] = await Promise.all([
    supabase.from("warehouses").select("name").eq("id", warehouseId).maybeSingle(),
    supabase
      .from("warehouse_locations")
      .select("id, full_code, name")
      .eq("warehouse_id", warehouseId)
      .eq("is_placeable", true)
      .is("deleted_at", null)
      .order("full_code"),
  ]);

  const locationIds = (locations ?? []).map((l) => l.id);
  const { data: codes } = locationIds.length
    ? await supabase
        .from("warehouse_location_codes")
        .select("warehouse_location_id, code_type, image_url")
        .in("warehouse_location_id", locationIds)
        .eq("is_active", true)
    : { data: [] };

  const codesByLocation = new Map<string, { qr?: string | null; barcode?: string | null }>();
  for (const c of codes ?? []) {
    const entry = codesByLocation.get(c.warehouse_location_id) ?? {};
    if (c.code_type === "qr") entry.qr = c.image_url;
    if (c.code_type === "barcode") entry.barcode = c.image_url;
    codesByLocation.set(c.warehouse_location_id, entry);
  }

  const labeled = (locations ?? []).filter((l) => codesByLocation.has(l.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold">{warehouse?.name ?? "Warehouse"} — location labels</h1>
        <PrintButton canPrint={canPrint} />
      </div>

      {labeled.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No labeled locations yet. Generate QR/barcode labels from the Location Explorer first.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3">
          {labeled.map((location) => {
            const codes = codesByLocation.get(location.id);
            return (
              <div
                key={location.id}
                className="flex flex-col items-center gap-2 rounded-md border p-3 text-center break-inside-avoid"
              >
                <p className="font-mono text-sm font-bold">{location.full_code}</p>
                {location.name && <p className="text-muted-foreground text-xs">{location.name}</p>}
                {codes?.qr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={codes.qr} alt="QR code" className="size-24" />
                )}
                {codes?.barcode && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={codes.barcode} alt="Barcode" className="h-10 w-full object-contain" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
