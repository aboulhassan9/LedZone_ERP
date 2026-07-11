"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/modules/inventory/components/items/overview-tab";
import { PurchaseWarrantyTab } from "@/modules/inventory/components/items/purchase-warranty-tab";
import { MaintenanceTab } from "@/modules/inventory/components/items/maintenance-tab";
import { IncidentsTab } from "@/modules/inventory/components/items/incidents-tab";
import { AttachmentsTab, type AttachmentWithUrl } from "@/modules/inventory/components/items/attachments-tab";
import { ActivityTab } from "@/modules/inventory/components/items/activity-tab";
import type { EquipmentItemRow, EquipmentItemMovementRow } from "@/modules/inventory/repositories/equipment-item-repository";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";
import type { EquipmentItemCodeRow } from "@/modules/inventory/repositories/equipment-item-code-repository";
import type { EquipmentPurchaseRow } from "@/modules/inventory/repositories/purchase-repository";
import type { SupplierRow } from "@/modules/inventory/repositories/supplier-repository";
import type { EquipmentItemWarrantyRow } from "@/modules/inventory/repositories/warranty-repository";
import type { EquipmentDepreciationPolicyRow } from "@/modules/inventory/repositories/depreciation-repository";
import type {
  EquipmentMaintenanceScheduleRow,
  EquipmentMaintenanceRecordRow,
} from "@/modules/inventory/repositories/maintenance-repository";
import type {
  EquipmentDamageReportRow,
  EquipmentLostReportRow,
} from "@/modules/inventory/repositories/incident-repository";

export function ItemDetailTabs({
  item,
  model,
  locationName,
  storageLocations,
  qrCode,
  barcode,
  purchase,
  supplier,
  warranties,
  depreciationPolicy,
  currencies,
  maintenanceSchedules,
  maintenanceRecords,
  damageReports,
  lostReports,
  attachments,
  movements,
  scans,
}: {
  item: EquipmentItemRow;
  model: EquipmentModelRow | null;
  locationName: (id: string | null) => string;
  storageLocations: { id: string; name: string }[];
  qrCode: EquipmentItemCodeRow | null;
  barcode: EquipmentItemCodeRow | null;
  purchase: EquipmentPurchaseRow | null;
  supplier: SupplierRow | null;
  warranties: EquipmentItemWarrantyRow[];
  depreciationPolicy: EquipmentDepreciationPolicyRow | null;
  currencies: { code: string; name: string }[];
  maintenanceSchedules: EquipmentMaintenanceScheduleRow[];
  maintenanceRecords: EquipmentMaintenanceRecordRow[];
  damageReports: EquipmentDamageReportRow[];
  lostReports: EquipmentLostReportRow[];
  attachments: AttachmentWithUrl[];
  movements: EquipmentItemMovementRow[];
  scans: { id: string; scan_context: string; scanned_at: string; note: string | null }[];
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="purchase">Purchase &amp; Warranty</TabsTrigger>
        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        <TabsTrigger value="incidents">Damage &amp; Lost</TabsTrigger>
        <TabsTrigger value="attachments">Attachments</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewTab
          item={item}
          model={model}
          locationName={locationName(item.current_storage_location_id)}
          storageLocations={storageLocations}
          qrCode={qrCode}
          barcode={barcode}
        />
      </TabsContent>
      <TabsContent value="purchase">
        <PurchaseWarrantyTab
          itemId={item.id}
          purchase={purchase}
          supplier={supplier}
          warranties={warranties}
          depreciationPolicy={depreciationPolicy}
          currencies={currencies}
        />
      </TabsContent>
      <TabsContent value="maintenance">
        <MaintenanceTab
          itemId={item.id}
          schedules={maintenanceSchedules}
          records={maintenanceRecords}
          currencies={currencies}
        />
      </TabsContent>
      <TabsContent value="incidents">
        <IncidentsTab
          itemId={item.id}
          damageReports={damageReports}
          lostReports={lostReports}
          currencies={currencies}
          storageLocations={storageLocations}
        />
      </TabsContent>
      <TabsContent value="attachments">
        <AttachmentsTab itemId={item.id} attachments={attachments} />
      </TabsContent>
      <TabsContent value="activity">
        <ActivityTab movements={movements} scans={scans} locationName={locationName} />
      </TabsContent>
    </Tabs>
  );
}
