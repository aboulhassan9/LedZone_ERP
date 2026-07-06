"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/modules/inventory/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { formatMoney } from "@/lib/currency";
import { WarrantyFormDialog } from "@/modules/inventory/components/items/warranty-form-dialog";
import { DepreciationFormDialog } from "@/modules/inventory/components/items/depreciation-form-dialog";
import type { EquipmentPurchaseRow } from "@/modules/inventory/repositories/purchase-repository";
import type { EquipmentItemWarrantyRow } from "@/modules/inventory/repositories/warranty-repository";
import type { EquipmentDepreciationPolicyRow } from "@/modules/inventory/repositories/depreciation-repository";
import type { SupplierRow } from "@/modules/inventory/repositories/supplier-repository";

export function PurchaseWarrantyTab({
  itemId,
  purchase,
  supplier,
  warranties,
  depreciationPolicy,
  currencies,
}: {
  itemId: string;
  purchase: EquipmentPurchaseRow | null;
  supplier: SupplierRow | null;
  warranties: EquipmentItemWarrantyRow[];
  depreciationPolicy: EquipmentDepreciationPolicyRow | null;
  currencies: { code: string; name: string }[];
}) {
  const { hasPermission } = useAuth();
  const canViewFinancials = hasPermission("inventory.financials.view");
  const canManage = hasPermission("inventory.manage");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase</CardTitle>
        </CardHeader>
        <CardContent>
          {purchase ? (
            <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Supplier</dt>
                <dd className="font-medium">{supplier?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Purchase date</dt>
                <dd className="font-medium">{purchase.purchase_date}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Invoice #</dt>
                <dd className="font-medium">{purchase.invoice_number ?? "—"}</dd>
              </div>
              {canViewFinancials && (
                <div>
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-medium">{formatMoney(purchase.total_amount, purchase.currency_code)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">No purchase linked to this item.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Warranties</CardTitle>
          {canManage && <WarrantyFormDialog itemId={itemId} purchaseId={purchase?.id} />}
        </CardHeader>
        <CardContent>
          {warranties.length === 0 ? (
            <p className="text-muted-foreground text-sm">No warranties registered.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warranties.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.provider_name ?? w.provider_type}</TableCell>
                    <TableCell>{w.warranty_type ?? "—"}</TableCell>
                    <TableCell>{w.start_date}</TableCell>
                    <TableCell>{w.end_date}</TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canViewFinancials && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Depreciation</CardTitle>
            {canManage && (
              <DepreciationFormDialog itemId={itemId} policy={depreciationPolicy} currencies={currencies} />
            )}
          </CardHeader>
          <CardContent>
            {depreciationPolicy ? (
              <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Purchase cost</dt>
                  <dd className="font-medium">
                    {formatMoney(depreciationPolicy.purchase_cost, depreciationPolicy.purchase_currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Salvage value</dt>
                  <dd className="font-medium">
                    {formatMoney(depreciationPolicy.salvage_value, depreciationPolicy.salvage_currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Useful life</dt>
                  <dd className="font-medium">{depreciationPolicy.useful_life_months} months</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Method</dt>
                  <dd className="font-medium">{depreciationPolicy.method.replace(/_/g, " ")}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">No depreciation inputs set.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
