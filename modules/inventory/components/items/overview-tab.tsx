"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/modules/inventory/components/status-badge";
import { ConditionBadge } from "@/modules/inventory/components/condition-badge";
import { QrPreview } from "@/modules/inventory/components/qr-preview";
import { BarcodePreview } from "@/modules/inventory/components/barcode-preview";
import { useAuth } from "@/providers/auth-provider";
import { ItemEditDialog } from "@/modules/inventory/components/items/item-edit-dialog";
import { ItemMovementDialog, MOVEMENT_PERMISSION } from "@/modules/inventory/components/items/item-movement-dialog";
import type { EquipmentItemRow } from "@/modules/inventory/repositories/equipment-item-repository";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";
import type { EquipmentItemCodeRow } from "@/modules/inventory/repositories/equipment-item-code-repository";

export function OverviewTab({
  item,
  model,
  locationName,
  storageLocations,
  qrCode,
  barcode,
}: {
  item: EquipmentItemRow;
  model: EquipmentModelRow | null;
  locationName: string;
  storageLocations: { id: string; name: string }[];
  qrCode: EquipmentItemCodeRow | null;
  barcode: EquipmentItemCodeRow | null;
}) {
  const { hasPermission } = useAuth();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          {hasPermission("inventory.manage") && <ItemEditDialog item={item} />}
        </CardHeader>
        <CardContent className="grid gap-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Model</dt>
              <dd className="font-medium">{model?.model_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Serial number</dt>
              <dd className="font-medium">{item.serial_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd><StatusBadge status={item.current_status} /></dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Condition</dt>
              <dd><ConditionBadge condition={item.current_condition} /></dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Current location</dt>
              <dd className="font-medium">{locationName}</dd>
            </div>
          </dl>
          {item.notes && (
            <div>
              <dt className="text-muted-foreground text-sm">Notes</dt>
              <dd className="text-sm">{item.notes}</dd>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {hasPermission(MOVEMENT_PERMISSION.transfer) && (
              <ItemMovementDialog itemId={item.id} kind="transfer" storageLocations={storageLocations} />
            )}
            {hasPermission(MOVEMENT_PERMISSION.check_out) && (
              <ItemMovementDialog itemId={item.id} kind="check_out" storageLocations={storageLocations} />
            )}
            {hasPermission(MOVEMENT_PERMISSION.check_in) && (
              <ItemMovementDialog itemId={item.id} kind="check_in" storageLocations={storageLocations} />
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <QrPreview itemId={item.id} code={qrCode} />
        <BarcodePreview itemId={item.id} code={barcode} />
      </div>
    </div>
  );
}
