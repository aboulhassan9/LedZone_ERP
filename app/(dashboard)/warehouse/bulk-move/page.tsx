import { requirePermission } from "@/lib/auth/permissions";
import { BulkMoveByScan } from "@/modules/warehouse/components/scan/bulk-move-by-scan";

export default async function BulkMovePage() {
  await requirePermission("warehouse.view");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk move</h1>
        <p className="text-muted-foreground text-sm">
          Scan several items, scan one destination bin, and move them all at once.
        </p>
      </div>
      <BulkMoveByScan />
    </div>
  );
}
