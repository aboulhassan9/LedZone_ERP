"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WarehousePicker({
  warehouses,
  value,
}: {
  warehouses: { id: string; name: string; code: string }[];
  value: string;
}) {
  const router = useRouter();

  return (
    <Select value={value} onValueChange={(id) => router.push(`/warehouse/locations?warehouseId=${id}`)}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a warehouse" />
      </SelectTrigger>
      <SelectContent>
        {warehouses.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name} ({w.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
