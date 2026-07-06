"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";

export type ConsumableStockLevelRow = {
  id: string;
  model_id: string;
  storage_location_id: string;
  quantity_on_hand: number;
  unit_of_measure: string;
  reorder_threshold: number | null;
};

export function ConsumableStockTable({
  stockLevels,
  models,
  storageLocations,
}: {
  stockLevels: ConsumableStockLevelRow[];
  models: EquipmentModelRow[];
  storageLocations: { id: string; name: string }[];
}) {
  const modelName = (id: string) => models.find((m) => m.id === id)?.model_name ?? "—";
  const locationName = (id: string) => storageLocations.find((l) => l.id === id)?.name ?? "—";

  const columns = useMemo<ColumnDef<ConsumableStockLevelRow>[]>(
    () => [
      {
        id: "model",
        accessorFn: (row) => modelName(row.model_id),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Consumable" />,
        cell: ({ row }) => <span className="font-medium">{modelName(row.original.model_id)}</span>,
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => locationName(row.original.storage_location_id),
      },
      {
        id: "quantity",
        header: "On hand",
        cell: ({ row }) => {
          const low =
            row.original.reorder_threshold != null &&
            row.original.quantity_on_hand <= row.original.reorder_threshold;
          return (
            <span className="flex items-center gap-2">
              {row.original.quantity_on_hand} {row.original.unit_of_measure}
              {low && (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                  Low stock
                </Badge>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "reorder_threshold",
        header: "Reorder threshold",
        cell: ({ row }) => row.original.reorder_threshold ?? "—",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stockLevels, models, storageLocations]
  );

  return (
    <DataTable columns={columns} data={stockLevels} searchKey="model" searchPlaceholder="Search consumables..." />
  );
}
