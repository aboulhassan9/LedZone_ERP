"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/modules/inventory/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { formatMoney } from "@/lib/currency";
import { DamageReportDialog, LostReportDialog } from "@/modules/inventory/components/items/incident-dialogs";
import type {
  EquipmentDamageReportRow,
  EquipmentLostReportRow,
} from "@/modules/inventory/repositories/incident-repository";

export function IncidentsTab({
  itemId,
  damageReports,
  lostReports,
  currencies,
  storageLocations,
}: {
  itemId: string;
  damageReports: EquipmentDamageReportRow[];
  lostReports: EquipmentLostReportRow[];
  currencies: { code: string; name: string }[];
  storageLocations: { id: string; name: string }[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.maintenance.manage");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Damage reports</CardTitle>
          {canManage && <DamageReportDialog itemId={itemId} currencies={currencies} />}
        </CardHeader>
        <CardContent>
          {damageReports.length === 0 ? (
            <p className="text-muted-foreground text-sm">No damage reports.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Repair cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {damageReports.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="capitalize">{d.severity}</TableCell>
                    <TableCell className="text-muted-foreground">{d.description}</TableCell>
                    <TableCell>
                      {d.repair_cost != null && d.currency_code ? formatMoney(d.repair_cost, d.currency_code) : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Lost reports</CardTitle>
          {canManage && <LostReportDialog itemId={itemId} storageLocations={storageLocations} />}
        </CardHeader>
        <CardContent>
          {lostReports.length === 0 ? (
            <p className="text-muted-foreground text-sm">No lost reports.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lostReports.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">{l.description ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={l.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
