"use client";

import { useState, useTransition } from "react";
import { QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { assignQRCodeAction } from "@/modules/inventory/actions/equipment-item-code-actions";
import type { EquipmentItemCodeRow } from "@/modules/inventory/repositories/equipment-item-code-repository";

export function QrPreview({
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
      const result = await assignQRCodeAction(itemId);
      if (result.success) {
        setCurrent(result.data);
        toast.success("QR code generated");
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 pt-6">
        <div className="flex size-40 items-center justify-center rounded-md border bg-white">
          {current?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.image_url}
              alt="QR code"
              className="size-36 object-contain"
            />
          ) : (
            <QrCode className="text-muted-foreground size-16" />
          )}
        </div>
        {current ? (
          <p className="text-muted-foreground font-mono text-xs">{current.code_value}</p>
        ) : (
          <p className="text-muted-foreground text-xs">No QR code assigned yet.</p>
        )}
        {hasPermission("inventory.manage") && (
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={isPending}>
            {isPending ? "Generating..." : current ? "Regenerate QR code" : "Generate QR code"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
