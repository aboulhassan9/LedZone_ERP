import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/currency";
import { GenerateFinancialSnapshotDialog } from "@/modules/reports/components/generate-financial-snapshot-dialog";

export default async function FinancialHistoryPage() {
  await requirePermission("reports.view");

  const supabase = await createClient();
  const [{ data: reports }, { data: profiles }, canGenerate] = await Promise.all([
    supabase
      .from("financial_reports")
      .select(
        "id, period_type, period_start, period_end, currency_code, total_income, total_expenses, net_amount, payment_count, expense_count, generated_at, generated_by"
      )
      .order("period_start", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
    hasPermission("finance.manage"),
  ]);

  const generatorNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
  const reportRows = reports ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial history</h1>
          <p className="text-muted-foreground text-sm">
            Persisted weekly/monthly income (payments received) vs. expenses. Generated
            automatically every Monday and 1st-of-month, or on demand below.
          </p>
        </div>
        {canGenerate && <GenerateFinancialSnapshotDialog />}
      </div>

      <Card>
        <CardContent className="pt-6">
          {reportRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No reports generated yet. Automatic generation runs weekly and monthly once
              deployed with a CRON_SECRET set — or generate one now for a past period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Income</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.period_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{r.currency_code}</TableCell>
                    <TableCell>
                      {formatMoney(r.total_income, r.currency_code)}
                      <span className="text-muted-foreground text-xs"> ({r.payment_count})</span>
                    </TableCell>
                    <TableCell>
                      {formatMoney(r.total_expenses, r.currency_code)}
                      <span className="text-muted-foreground text-xs"> ({r.expense_count})</span>
                    </TableCell>
                    <TableCell className={r.net_amount >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatMoney(r.net_amount, r.currency_code)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.generated_by ? generatorNames[r.generated_by] ?? "—" : "Automatic"}
                      <br />
                      {new Date(r.generated_at).toLocaleString()}
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
