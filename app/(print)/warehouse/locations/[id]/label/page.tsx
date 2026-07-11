import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/modules/warehouse/components/locations/print-button";

export default async function LocationLabelPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("warehouse.view");
  const { id } = await params;
  const canPrint = (await hasPermission("warehouse.manage")) || (await hasPermission("warehouse.labels"));

  const supabase = await createClient();
  const [{ data: location }, { data: codes }] = await Promise.all([
    supabase
      .from("warehouse_locations")
      .select("id, warehouse_id, full_code, name, node_type")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("warehouse_location_codes")
      .select("code_type, image_url")
      .eq("warehouse_location_id", id)
      .eq("is_active", true),
  ]);

  if (!location) notFound();

  const { data: warehouse } = await supabase.from("warehouses").select("name").eq("id", location.warehouse_id).maybeSingle();
  const qr = (codes ?? []).find((c) => c.code_type === "qr");
  const barcode = (codes ?? []).find((c) => c.code_type === "barcode");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold">Location label</h1>
        <PrintButton canPrint={canPrint} />
      </div>

      <div className="flex w-full flex-col items-center gap-3 rounded-md border p-6 text-center print:border-0">
        <p className="text-muted-foreground text-sm">{warehouse?.name ?? "—"}</p>
        <p className="font-mono text-2xl font-bold">{location.full_code}</p>
        {location.name && <p className="text-sm">{location.name}</p>}

        {qr?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr.image_url} alt="QR code" className="size-40" />
        ) : (
          <p className="text-muted-foreground text-sm">No QR code generated yet.</p>
        )}
        {barcode?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={barcode.image_url} alt="Barcode" className="h-16 w-full object-contain" />
        ) : (
          <p className="text-muted-foreground text-sm">No barcode generated yet.</p>
        )}
      </div>

      {!qr && !barcode && (
        <p className="text-muted-foreground text-center text-sm print:hidden">
          Generate a QR code or barcode for this location from the Location Explorer first.
        </p>
      )}
    </div>
  );
}
