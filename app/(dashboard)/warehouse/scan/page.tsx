import { requirePermission } from "@/lib/auth/permissions";
import { ScanNavigator } from "@/modules/warehouse/components/scan/scan-navigator";

export default async function WarehouseScanPage() {
  await requirePermission("warehouse.view");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scan</h1>
        <p className="text-muted-foreground text-sm">
          Scan a location or equipment QR code / barcode to jump straight to it.
        </p>
      </div>
      <ScanNavigator />
    </div>
  );
}
