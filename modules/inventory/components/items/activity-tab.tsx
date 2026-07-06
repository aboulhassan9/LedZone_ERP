import { Timeline, type TimelineEntry } from "@/modules/inventory/components/timeline";
import type { EquipmentItemMovementRow } from "@/modules/inventory/repositories/equipment-item-repository";

type ScanRow = {
  id: string;
  scan_context: string;
  scanned_at: string;
  note: string | null;
};

export function ActivityTab({
  movements,
  scans,
  locationName,
}: {
  movements: EquipmentItemMovementRow[];
  scans: ScanRow[];
  locationName: (id: string | null) => string;
}) {
  const movementEntries: TimelineEntry[] = movements.map((m) => ({
    id: `movement-${m.id}`,
    title: m.movement_type.replace(/_/g, " "),
    description: `${m.from_storage_location_id ? locationName(m.from_storage_location_id) : "—"} → ${locationName(m.to_storage_location_id)}${m.reference_note ? ` — ${m.reference_note}` : ""}`,
    timestamp: m.moved_at,
  }));

  const scanEntries: TimelineEntry[] = scans.map((s) => ({
    id: `scan-${s.id}`,
    title: `Scan (${s.scan_context.replace(/_/g, " ")})`,
    description: s.note ?? undefined,
    timestamp: s.scanned_at,
  }));

  const entries = [...movementEntries, ...scanEntries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return <Timeline entries={entries} />;
}
