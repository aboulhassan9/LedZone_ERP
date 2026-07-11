"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/providers/auth-provider";
import { formatMoney } from "@/lib/currency";
import { MaintenanceScheduleDialog } from "@/modules/inventory/components/items/maintenance-schedule-dialog";
import { MaintenanceRecordDialog } from "@/modules/inventory/components/items/maintenance-record-dialog";
import type {
  EquipmentMaintenanceScheduleRow,
  EquipmentMaintenanceRecordRow,
} from "@/modules/inventory/repositories/maintenance-repository";

export function MaintenanceTab({
  itemId,
  schedules,
  records,
  currencies,
}: {
  itemId: string;
  schedules: EquipmentMaintenanceScheduleRow[];
  records: EquipmentMaintenanceRecordRow[];
  currencies: { code: string; name: string }[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.maintenance.manage");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Schedules</CardTitle>
          {canManage && <MaintenanceScheduleDialog itemId={itemId} />}
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-muted-foreground text-sm">No maintenance schedules.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Last performed</TableHead>
                  <TableHead>Next due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.maintenance_type}</TableCell>
                    <TableCell>{s.interval_days} days</TableCell>
                    <TableCell>{s.last_performed_date ?? "—"}</TableCell>
                    <TableCell>{s.next_due_date ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>History</CardTitle>
          {canManage && (
            <MaintenanceRecordDialog itemId={itemId} schedules={schedules} currencies={currencies} />
          )}
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-muted-foreground text-sm">No maintenance history yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.performed_date}</TableCell>
                    <TableCell>{r.maintenance_type}</TableCell>
                    <TableCell className="text-muted-foreground">{r.description ?? "—"}</TableCell>
                    <TableCell>
                      {r.cost != null && r.currency_code ? formatMoney(r.cost, r.currency_code) : "—"}
                    </TableCell>
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
