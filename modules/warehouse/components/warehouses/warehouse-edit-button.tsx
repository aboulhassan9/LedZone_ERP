"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WarehouseFormDialog } from "@/modules/warehouse/components/warehouses/warehouse-form-dialog";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

export function WarehouseEditButton({
  warehouse,
  locations,
  profiles,
}: {
  warehouse: WarehouseRow;
  locations: { id: string; name: string }[];
  profiles: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil />
        Edit
      </Button>
      <WarehouseFormDialog
        warehouse={warehouse}
        locations={locations}
        profiles={profiles}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
