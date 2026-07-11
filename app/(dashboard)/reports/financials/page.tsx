import { requirePermission } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/currency";
import { financialReportRepository } from "@/modules/reports/repositories/financial-report-repository";

export default async function FinancialsReportPage() {
  await requirePermission("reports.view");

  const [revenue, expenses] = await Promise.all([
    financialReportRepository.getRevenueByCurrency(),
    financialReportRepository.getExpensesByCategory(),
  ]);

  const currencies = [...new Set([...revenue.map((r) => r.currencyCode), ...expenses.map((e) => e.currencyCode)])];
  const netByCurrency = currencies.map((code) => {
    const rev = revenue.find((r) => r.currencyCode === code)?.totalRevenue ?? 0;
    const exp = expenses.filter((e) => e.currencyCode === code).reduce((sum, e) => sum + e.totalAmount, 0);
    return { currencyCode: code, revenue: rev, expenses: exp, net: rev - exp };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financials</h1>
        <p className="text-muted-foreground text-sm">Paid invoice revenue vs. approved/paid expenses, by currency.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Net position</CardTitle>
        </CardHeader>
        <CardContent>
          {netByCurrency.length === 0 ? (
            <p className="text-muted-foreground text-sm">No paid invoices or recorded expenses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {netByCurrency.map((row) => (
                  <TableRow key={row.currencyCode}>
                    <TableCell className="font-medium">{row.currencyCode}</TableCell>
                    <TableCell>{formatMoney(row.revenue, row.currencyCode)}</TableCell>
                    <TableCell>{formatMoney(row.expenses, row.currencyCode)}</TableCell>
                    <TableCell className={row.net >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatMoney(row.net, row.currencyCode)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expenses by category</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No expenses recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={`${e.category}-${e.currencyCode}`}>
                    <TableCell className="capitalize">{e.category.replace(/_/g, " ")}</TableCell>
                    <TableCell>{e.currencyCode}</TableCell>
                    <TableCell>{formatMoney(e.totalAmount, e.currencyCode)}</TableCell>
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
