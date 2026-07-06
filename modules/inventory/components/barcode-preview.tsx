"use client";

import { useState, useTransition } from "react";
import { Barcode as BarcodeIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { assignBarcodeAction } from "@/modules/inventory/actions/equipment-item-code-actions";
import type { EquipmentItemCodeRow } from "@/modules/inventory/repositories/equipment-item-code-repository";

export function BarcodePreview({
  itemId,
  code,
}: {
  itemId: string;
  code: EquipmentItemCodeRow | null;
}) {
  const { hasPermission } = useAuth();
  const [current, setCurrent] = useState(code);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await assignBarcodeAction(itemId);
      if (result.success) {
        setCurrent(result.data);
        toast.success("Barcode generated");
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 pt-6">
        <div className="flex h-24 w-52 items-center justify-center rounded-md border bg-white">
          {current?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.image_url}
              alt="Barcode"
              className="h-20 w-48 object-contain"
            />
          ) : (
            <BarcodeIcon className="text-muted-foreground size-12" />
          )}
        </div>
        {current ? (
          <p className="text-muted-foreground font-mono text-xs">{current.code_value}</p>
        ) : (
          <p className="text-muted-foreground text-xs">No barcode assigned yet.</p>
        )}
        {hasPermission("inventory.manage") && (
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={isPending}>
            {isPending ? "Generating..." : current ? "Regenerate barcode" : "Generate barcode"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
