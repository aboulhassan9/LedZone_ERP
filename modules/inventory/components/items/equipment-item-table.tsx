"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { createSelectionColumn } from "@/components/data-table/selection-column";
import { StatusBadge } from "@/modules/inventory/components/status-badge";
import { ConditionBadge } from "@/modules/inventory/components/condition-badge";
import { useAuth } from "@/providers/auth-provider";
import { archiveEquipmentItemAction } from "@/modules/inventory/actions/equipment-item-actions";
import type { EquipmentItemRow } from "@/modules/inventory/repositories/equipment-item-repository";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";

const ITEM_STATUSES = [
  "available",
  "reserved",
  "picked",
  "in_transit",
  "on_site",
  "returned",
  "inspection",
  "quarantined",
  "in_maintenance",
  "in_use",
  "scrapped",
  "lost",
];

export function EquipmentItemTable({
  items,
  models,
  storageLocations,
}: {
  items: EquipmentItemRow[];
  models: EquipmentModelRow[];
  storageLocations: { id: string; name: string }[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRows, setSelectedRows] = useState<EquipmentItemRow[]>([]);
  const [isPending, startTransition] = useTransition();

  const modelName = (id: string) => models.find((m) => m.id === id)?.model_name ?? "—";
  const locationName = (id: string | null) =>
    storageLocations.find((l) => l.id === id)?.name ?? "—";

  const filtered = useMemo(
    () => (statusFilter === "all" ? items : items.filter((i) => i.current_status === statusFilter)),
    [items, statusFilter]
  );

  function handleBulkArchive() {
    startTransition(async () => {
      const results = await Promise.all(
        selectedRows.map((row) => archiveEquipmentItemAction(row.id))
      );
      const failed = results.filter((r) => !r.success).length;
      if (failed === 0) toast.success(`${results.length} item(s) archived`);
      else toast.error(`${failed} item(s) failed to archive`);
    });
  }

  const columns = useMemo<ColumnDef<EquipmentItemRow>[]>(
    () => [
      ...(canManage ? [createSelectionColumn<EquipmentItemRow>()] : []),
      {
        accessorKey: "asset_tag",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Asset Tag" />,
        cell: ({ row }) => (
          <Link href={`/inventory/items/${row.original.id}`} className="font-mono font-medium hover:underline">
            {row.original.asset_tag}
          </Link>
        ),
      },
      { id: "model", header: "Model", cell: ({ row }) => modelName(row.original.model_id) },
      {
        accessorKey: "serial_number",
        header: "Serial #",
        cell: ({ row }) => row.original.serial_number ?? "—",
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => locationName(row.original.current_storage_location_id),
      },
      {
        accessorKey: "current_status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.current_status} />,
      },
      {
        accessorKey: "current_condition",
        header: "Condition",
        cell: ({ row }) => <ConditionBadge condition={row.original.current_condition} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, models, storageLocations, canManage]
  );

  return (
    <DataTable
      columns={columns}
      data={filtered}
      searchKey="asset_tag"
      searchPlaceholder="Search by asset tag..."
      onRowSelectionChange={canManage ? setSelectedRows : undefined}
      toolbar={
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ITEM_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && selectedRows.length > 0 && (
            <Button variant="outline" size="sm" disabled={isPending} onClick={handleBulkArchive}>
              <Archive />
              Archive {selectedRows.length} selected
            </Button>
          )}
        </div>
      }
    />
  );
}
