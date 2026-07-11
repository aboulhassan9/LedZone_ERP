"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, MapPin, Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScanInput } from "@/modules/warehouse/components/scan/scan-input";
import { resolveScanAction } from "@/modules/warehouse/actions/scan-actions";
import { bulkMoveEquipmentItemsAction } from "@/modules/inventory/actions/equipment-item-actions";
import type { EquipmentItemRow } from "@/modules/inventory/repositories/equipment-item-repository";
import type { WarehouseLocationRow } from "@/modules/warehouse/repositories/warehouse-location-repository";

// Same scan-then-scan flow as the picking screen: scan every item going to the same bin,
// then scan the destination bin itself, then confirm. One resolveScanAction call handles
// both — it already tells us whether a code is a location or an item.
export function BulkMoveByScan() {
  const router = useRouter();
  const [queue, setQueue] = useState<EquipmentItemRow[]>([]);
  const [destination, setDestination] = useState<WarehouseLocationRow | null>(null);
  const [reason, setReason] = useState("");

  const resolve = useMutation({
    mutationFn: (codeValue: string) => resolveScanAction(codeValue),
    onSuccess: (result, codeValue) => {
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      if (result.data.type === "item") {
        const scannedItem = result.data.item;
        setQueue((q) => (q.some((i) => i.id === scannedItem.id) ? q : [...q, scannedItem]));
      } else if (result.data.type === "location") {
        setDestination(result.data.location);
      } else {
        toast.error(`"${codeValue}" doesn't match a location or item.`);
      }
    },
  });

  const move = useMutation({
    mutationFn: () =>
      bulkMoveEquipmentItemsAction({
        itemIds: queue.map((i) => i.id),
        toWarehouseLocationId: destination!.id,
        reason: reason.trim() || undefined,
      }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Moved ${queue.length} item(s) to ${destination?.full_code}`);
        setQueue([]);
        setDestination(null);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Scan items, then the destination bin</CardTitle>
        </CardHeader>
        <CardContent>
          <ScanInput onScan={(value) => resolve.mutate(value)} disabled={resolve.isPending} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destination</CardTitle>
        </CardHeader>
        <CardContent>
          {destination ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <MapPin className="text-muted-foreground size-4" />
                <span className="font-mono font-medium">{destination.full_code}</span>
              </div>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setDestination(null)}>
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Scan a bin/staging location to set the destination.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items ({queue.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {queue.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items scanned yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {queue.map((item) => (
                <li key={item.id}>
                  <Badge variant="outline" className="gap-1.5 py-1.5 pr-1">
                    <Boxes className="size-3.5" />
                    {item.asset_tag}
                    <button
                      type="button"
                      onClick={() => setQueue((q) => q.filter((i) => i.id !== item.id))}
                      className="hover:bg-accent ml-1 rounded-full"
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            className="w-fit"
            disabled={queue.length === 0 || !destination || move.isPending}
            onClick={() => move.mutate()}
          >
            {move.isPending ? "Moving..." : `Move ${queue.length} item(s)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
