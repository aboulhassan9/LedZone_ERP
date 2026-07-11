import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ItemDetailTabs } from "@/modules/inventory/components/items/item-detail-tabs";
import { StatusBadge } from "@/modules/inventory/components/status-badge";
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
import type { EquipmentItemAttachmentRow } from "@/modules/inventory/repositories/attachment-repository";
import type { AttachmentWithUrl } from "@/modules/inventory/components/items/attachments-tab";

const MODEL_COLUMNS =
  "id, category_id, manufacturer_id, brand_id, model_name, model_number, description, tracking_type, specifications, default_warranty_months, expected_lifespan_months, image_url, status";

export default async function EquipmentItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("inventory.view");
  const { id } = await params;

  const supabase = await createClient();
  const canViewFinancials = await hasPermission("inventory.financials.view");

  const { data: item } = await supabase
    .from("equipment_items")
    .select(
      "id, model_id, asset_tag, serial_number, purchase_id, current_status, current_condition, current_storage_location_id, notes"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!item) notFound();
  const itemRow = item as EquipmentItemRow;

  const [
    { data: model },
    { data: storageLocations },
    { data: purchase },
    { data: warranties },
    { data: depreciationPolicy },
    { data: maintenanceSchedules },
    { data: maintenanceRecords },
    { data: damageReports },
    { data: lostReports },
    { data: attachments },
    { data: movements },
    { data: scans },
    { data: qrCode },
    { data: barcode },
    { data: currencies },
  ] = await Promise.all([
    supabase.from("equipment_models").select(MODEL_COLUMNS).eq("id", itemRow.model_id).maybeSingle(),
    supabase.from("storage_locations").select("id, name").is("deleted_at", null).order("name"),
    itemRow.purchase_id
      ? supabase
          .from("equipment_purchases")
          .select(
            "id, supplier_id, purchase_date, invoice_number, currency_code, exchange_rate_id, subtotal_amount, tax_amount, total_amount, status, notes"
          )
          .eq("id", itemRow.purchase_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("equipment_item_warranties")
      .select(
        "id, item_id, purchase_id, provider_type, provider_name, warranty_type, start_date, end_date, terms, claim_contact, status"
      )
      .eq("item_id", id)
      .is("deleted_at", null)
      .order("start_date", { ascending: false }),
    canViewFinancials
      ? supabase
          .from("equipment_depreciation_policies")
          .select(
            "id, item_id, purchase_cost, purchase_currency, salvage_value, salvage_currency, useful_life_months, method, start_date"
          )
          .eq("item_id", id)
          .is("deleted_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("equipment_maintenance_schedules")
      .select("id, item_id, maintenance_type, interval_days, last_performed_date, next_due_date, is_active")
      .eq("item_id", id)
      .is("deleted_at", null)
      .order("next_due_date"),
    supabase
      .from("equipment_maintenance_records")
      .select("id, item_id, schedule_id, damage_report_id, performed_date, maintenance_type, description, cost, currency_code")
      .eq("item_id", id)
      .order("performed_date", { ascending: false }),
    supabase
      .from("equipment_damage_reports")
      .select("id, item_id, description, severity, status, repair_cost, currency_code")
      .eq("item_id", id)
      .order("reported_date", { ascending: false }),
    supabase
      .from("equipment_lost_reports")
      .select("id, item_id, description, status, last_known_location_id")
      .eq("item_id", id)
      .order("reported_date", { ascending: false }),
    supabase
      .from("equipment_item_attachments")
      .select("id, item_id, attachment_type, file_name, storage_path, mime_type, file_size_bytes, description")
      .eq("item_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("equipment_item_movements")
      .select("id, item_id, from_storage_location_id, to_storage_location_id, movement_type, reference_note, moved_at")
      .eq("item_id", id)
      .order("moved_at", { ascending: false }),
    supabase
      .from("equipment_item_scans")
      .select("id, scan_context, scanned_at, note")
      .eq("item_id", id)
      .order("scanned_at", { ascending: false }),
    supabase
      .from("equipment_item_codes")
      .select("id, item_id, code_type, code_value, image_url, is_active, generated_at")
      .eq("item_id", id)
      .eq("code_type", "qr")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("equipment_item_codes")
      .select("id, item_id, code_type, code_value, image_url, is_active, generated_at")
      .eq("item_id", id)
      .eq("code_type", "barcode")
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
  ]);

  const purchaseRow = purchase as EquipmentPurchaseRow | null;
  let supplier: SupplierRow | null = null;
  if (purchaseRow) {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, contact_name, email, phone, address, country, preferred_currency, status")
      .eq("id", purchaseRow.supplier_id)
      .maybeSingle();
    supplier = data as SupplierRow | null;
  }

  const attachmentRows = (attachments ?? []) as EquipmentItemAttachmentRow[];
  const attachmentsWithUrls: AttachmentWithUrl[] = await Promise.all(
    attachmentRows.map(async (a) => {
      if (a.attachment_type === "purchase_invoice" && !canViewFinancials) {
        return { ...a, url: null };
      }
      const { data } = await supabase.storage.from("equipment-docs").createSignedUrl(a.storage_path, 300);
      return { ...a, url: data?.signedUrl ?? null };
    })
  );

  const locationRows = storageLocations ?? [];
  const locationName = (locationId: string | null) =>
    locationRows.find((l) => l.id === locationId)?.name ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <span className="font-mono">{itemRow.asset_tag}</span>
            <StatusBadge status={itemRow.current_status} />
          </h1>
          <p className="text-muted-foreground text-sm">
            {(model as EquipmentModelRow | null)?.model_name ?? "Unknown model"}
          </p>
        </div>
      </div>
      <ItemDetailTabs
        item={itemRow}
        model={model as EquipmentModelRow | null}
        locationName={locationName}
        storageLocations={locationRows}
        qrCode={qrCode as EquipmentItemCodeRow | null}
        barcode={barcode as EquipmentItemCodeRow | null}
        purchase={purchaseRow}
        supplier={supplier}
        warranties={(warranties ?? []) as EquipmentItemWarrantyRow[]}
        depreciationPolicy={depreciationPolicy as EquipmentDepreciationPolicyRow | null}
        currencies={currencies ?? []}
        maintenanceSchedules={(maintenanceSchedules ?? []) as EquipmentMaintenanceScheduleRow[]}
        maintenanceRecords={(maintenanceRecords ?? []) as EquipmentMaintenanceRecordRow[]}
        damageReports={(damageReports ?? []) as EquipmentDamageReportRow[]}
        lostReports={(lostReports ?? []) as EquipmentLostReportRow[]}
        attachments={attachmentsWithUrls}
        movements={(movements ?? []) as EquipmentItemMovementRow[]}
        scans={scans ?? []}
      />
    </div>
  );
}
