"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QrCode, Barcode, RefreshCw, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listActiveLocationCodesAction,
  assignLocationQrCodeAction,
  assignLocationBarcodeAction,
} from "@/modules/warehouse/actions/warehouse-location-code-actions";

export function LocationCodePanel({
  locationId,
  canGenerate,
}: {
  locationId: string;
  canGenerate: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["warehouse-location-codes", locationId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listActiveLocationCodesAction(locationId),
  });

  const codes = data?.success ? data.data : [];
  const qr = codes.find((c) => c.code_type === "qr");
  const barcode = codes.find((c) => c.code_type === "barcode");

  const generateQr = useMutation({
    mutationFn: () => assignLocationQrCodeAction(locationId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("QR code generated");
        queryClient.invalidateQueries({ queryKey });
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const generateBarcode = useMutation({
    mutationFn: () => assignLocationBarcodeAction(locationId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Barcode generated");
        queryClient.invalidateQueries({ queryKey });
      } else {
        toast.error(result.error.message);
      }
    },
  });

  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
        <QrCode className="size-3.5" /> Labels
      </p>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-2 rounded-md border p-3">
            {qr?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr.image_url} alt="QR code" className="size-20" />
            ) : (
              <div className="text-muted-foreground flex size-20 items-center justify-center rounded border border-dashed text-xs">
                No QR
              </div>
            )}
            {canGenerate && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={generateQr.isPending}
                onClick={() => generateQr.mutate()}
              >
                <RefreshCw /> {qr ? "Regenerate" : "Generate"}
              </Button>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 rounded-md border p-3">
            {barcode?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={barcode.image_url} alt="Barcode" className="h-20 w-full object-contain" />
            ) : (
              <div className="text-muted-foreground flex h-20 w-full items-center justify-center rounded border border-dashed text-xs">
                <Barcode className="mr-1 size-4" /> No barcode
              </div>
            )}
            {canGenerate && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={generateBarcode.isPending}
                onClick={() => generateBarcode.mutate()}
              >
                <RefreshCw /> {barcode ? "Regenerate" : "Generate"}
              </Button>
            )}
          </div>
        </div>
      )}
      {(qr || barcode) && (
        <Button size="sm" variant="ghost" className="w-fit" asChild>
          <Link href={`/warehouse/locations/${locationId}/label`} target="_blank">
            <Printer /> Print label
          </Link>
        </Button>
      )}
    </div>
  );
}
