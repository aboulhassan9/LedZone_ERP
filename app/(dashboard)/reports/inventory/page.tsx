import { requirePermission } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { inventoryReportRepository } from "@/modules/reports/repositories/inventory-report-repository";

export default async function InventoryReportPage() {
  await requirePermission("reports.view");

  const [statusBreakdown, modelUtilization] = await Promise.all([
    inventoryReportRepository.getStatusBreakdown(),
    inventoryReportRepository.getModelUtilization(),
  ]);
  const totalItems = statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory utilization</h1>
        <p className="text-muted-foreground text-sm">{totalItems} tracked equipment item{totalItems === 1 ? "" : "s"}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {statusBreakdown.length === 0 ? (
            <p className="text-muted-foreground text-sm">No equipment items yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {statusBreakdown.map((s) => (
                <Badge key={s.status} variant="outline" className="capitalize">
                  {s.status.replace(/_/g, " ")}: {s.count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Utilization by model</CardTitle>
        </CardHeader>
        <CardContent>
          {modelUtilization.length === 0 ? (
            <p className="text-muted-foreground text-sm">No equipment items yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Out / Total</TableHead>
                  <TableHead className="w-1/3">Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelUtilization.map((m) => (
                  <TableRow key={m.modelId}>
                    <TableCell className="font-medium">{m.modelName}</TableCell>
                    <TableCell>
                      {m.itemsOut} / {m.totalItems}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={m.utilizationPct} className="w-full" />
                        <span className="text-muted-foreground w-10 text-right text-xs">{m.utilizationPct}%</span>
                      </div>
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
