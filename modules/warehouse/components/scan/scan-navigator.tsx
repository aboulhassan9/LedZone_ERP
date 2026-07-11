"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Boxes, SearchX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanInput } from "@/modules/warehouse/components/scan/scan-input";
import { resolveScanAction } from "@/modules/warehouse/actions/scan-actions";
import type { ScanResult } from "@/modules/warehouse/services/scan-service";

export function ScanNavigator() {
  const router = useRouter();
  const [lastResult, setLastResult] = useState<ScanResult | "error" | null>(null);
  const [lastCode, setLastCode] = useState("");

  const resolve = useMutation({
    mutationFn: (codeValue: string) => resolveScanAction(codeValue),
    onSuccess: (result, codeValue) => {
      setLastCode(codeValue);
      if (!result.success) {
        toast.error(result.error.message);
        setLastResult("error");
        return;
      }
      setLastResult(result.data);
      if (result.data.type === "not_found") {
        toast.error(`No location or item matches "${codeValue}".`);
      }
    },
  });

  function goToResult() {
    if (!lastResult || lastResult === "error" || lastResult.type === "not_found") return;
    if (lastResult.type === "location") {
      router.push(`/warehouse/locations?warehouseId=${lastResult.location.warehouse_id}&locationId=${lastResult.location.id}`);
    } else {
      router.push(`/inventory/items/${lastResult.item.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Scan a code</CardTitle>
        </CardHeader>
        <CardContent>
          <ScanInput onScan={(value) => resolve.mutate(value)} disabled={resolve.isPending} />
        </CardContent>
      </Card>

      {lastResult && lastResult !== "error" && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            {lastResult.type === "location" && (
              <>
                <div className="flex items-center gap-3">
                  <MapPin className="text-muted-foreground size-5" />
                  <div>
                    <p className="font-mono font-medium">{lastResult.location.full_code}</p>
                    <p className="text-muted-foreground text-sm">{lastResult.location.name || "Warehouse location"}</p>
                  </div>
                </div>
                <Button onClick={goToResult}>Open location</Button>
              </>
            )}
            {lastResult.type === "item" && (
              <>
                <div className="flex items-center gap-3">
                  <Boxes className="text-muted-foreground size-5" />
                  <div>
                    <p className="font-mono font-medium">{lastResult.item.asset_tag}</p>
                    <p className="text-muted-foreground text-sm capitalize">{lastResult.item.current_status.replace(/_/g, " ")}</p>
                  </div>
                </div>
                <Button onClick={goToResult}>Open item</Button>
              </>
            )}
            {lastResult.type === "not_found" && (
              <div className="flex items-center gap-3">
                <SearchX className="text-muted-foreground size-5" />
                <p className="text-muted-foreground text-sm">
                  &quot;{lastCode}&quot; doesn&apos;t match a warehouse location or equipment item.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
