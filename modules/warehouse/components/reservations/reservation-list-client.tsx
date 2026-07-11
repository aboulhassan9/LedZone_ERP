"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import { releaseReservationAction } from "@/modules/warehouse/actions/reservation-actions";
import type { WarehouseReservationRow } from "@/modules/warehouse/repositories/warehouse-reservation-repository";

export function ReservationListClient({
  reservations,
  itemLabels,
  locationCodes,
  canManage,
}: {
  reservations: WarehouseReservationRow[];
  itemLabels: Record<string, string>;
  locationCodes: Record<string, string>;
  canManage: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const release = useMutation({
    mutationFn: (id: string) => releaseReservationAction(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Reservation released");
        queryClient.invalidateQueries({ queryKey: ["warehouse-reservations"] });
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  if (reservations.length === 0) {
    return <p className="text-muted-foreground text-sm">No reservations yet.</p>;
  }

  function status(r: WarehouseReservationRow): string {
    if (r.released_at) return "cancelled";
    if (new Date(r.expires_at).getTime() < Date.now()) return "expired";
    return "active";
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Target</TableHead>
          <TableHead>Reserved for</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Note</TableHead>
          {canManage && <TableHead className="w-24" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {reservations.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">
              {r.item_id ? itemLabels[r.item_id] ?? r.item_id : locationCodes[r.warehouse_location_id ?? ""] ?? "—"}
            </TableCell>
            <TableCell className="capitalize">{r.reserved_for_type.replace(/_/g, " ")}</TableCell>
            <TableCell>{new Date(r.expires_at).toLocaleString()}</TableCell>
            <TableCell>
              <WarehouseStatusBadge status={status(r)} />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">{r.reference_note ?? "—"}</TableCell>
            {canManage && (
              <TableCell>
                {!r.released_at && (
                  <Button size="sm" variant="ghost" disabled={release.isPending} onClick={() => release.mutate(r.id)}>
                    <XCircle className="text-destructive" /> Release
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
