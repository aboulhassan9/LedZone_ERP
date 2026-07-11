"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FleetStatusBadge } from "@/modules/fleet/components/status-badge";
import { VehicleFleetInfoDialog } from "@/modules/fleet/components/vehicles/vehicle-fleet-info-dialog";
import { MaintenanceRecordDialog } from "@/modules/fleet/components/vehicles/maintenance-record-dialog";
import { FuelLogDialog } from "@/modules/fleet/components/vehicles/fuel-log-dialog";
import type { CurrencyOption } from "@/modules/fleet/components/vehicles/maintenance-record-dialog";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/providers/auth-provider";
import type { VehicleRow } from "@/modules/fleet/repositories/vehicle-repository";
import type { MaintenanceRecordRow } from "@/modules/fleet/repositories/maintenance-record-repository";
import type { FuelLogRow } from "@/modules/fleet/repositories/fuel-log-repository";

export function VehicleDetail({
  vehicle,
  maintenanceRecords,
  fuelLogs,
  currencies,
}: {
  vehicle: VehicleRow;
  maintenanceRecords: MaintenanceRecordRow[];
  fuelLogs: FuelLogRow[];
  currencies: CurrencyOption[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("fleet.manage");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {vehicle.name}
            <FleetStatusBadge status={vehicle.fleet_status} />
          </CardTitle>
          {canManage && <VehicleFleetInfoDialog vehicle={vehicle} />}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Make / model</dt>
              <dd className="font-medium">{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Year</dt>
              <dd className="font-medium">{vehicle.year ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Plate</dt>
              <dd className="font-medium">{vehicle.plate_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">VIN</dt>
              <dd className="font-medium">{vehicle.vin ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fuel type</dt>
              <dd className="font-medium capitalize">{vehicle.fuel_type ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Odometer</dt>
              <dd className="font-medium">{vehicle.odometer_km != null ? `${vehicle.odometer_km.toLocaleString()} km` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Insurance expiry</dt>
              <dd className="font-medium">
                {vehicle.insurance_expiry_date ? new Date(vehicle.insurance_expiry_date).toLocaleDateString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Registration expiry</dt>
              <dd className="font-medium">
                {vehicle.registration_expiry_date
                  ? new Date(vehicle.registration_expiry_date).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
          {vehicle.capacity_notes && <p className="text-muted-foreground mt-4 text-sm">{vehicle.capacity_notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Maintenance history</CardTitle>
          {canManage && <MaintenanceRecordDialog vehicleId={vehicle.id} currencies={currencies} />}
        </CardHeader>
        <CardContent>
          {maintenanceRecords.length === 0 ? (
            <p className="text-muted-foreground text-sm">No maintenance records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Odometer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceRecords.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.service_date).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{r.maintenance_type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="font-medium">{r.description}</TableCell>
                    <TableCell>{r.cost != null && r.currency_code ? formatMoney(r.cost, r.currency_code) : "—"}</TableCell>
                    <TableCell>{r.odometer_km != null ? `${r.odometer_km.toLocaleString()} km` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Fuel logs</CardTitle>
          {canManage && <FuelLogDialog vehicleId={vehicle.id} currencies={currencies} />}
        </CardHeader>
        <CardContent>
          {fuelLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No fuel logs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Liters</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Odometer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.fuel_date).toLocaleDateString()}</TableCell>
                    <TableCell>{log.liters}</TableCell>
                    <TableCell>{formatMoney(log.cost, log.currency_code)}</TableCell>
                    <TableCell>{log.odometer_km != null ? `${log.odometer_km.toLocaleString()} km` : "—"}</TableCell>
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
