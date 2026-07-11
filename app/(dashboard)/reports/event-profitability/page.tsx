import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/currency";
import { eventProfitabilityReportRepository } from "@/modules/reports/repositories/event-profitability-report-repository";

export default async function EventProfitabilityReportPage() {
  await requirePermission("reports.view");

  const rows = await eventProfitabilityReportRepository.list();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Event profitability</h1>
        <p className="text-muted-foreground text-sm">
          Revenue (paid invoices) minus cost (approved/paid expenses) per event, by currency.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events with paid invoices or expenses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.eventId}-${row.currencyCode}`}>
                    <TableCell>
                      <Link href={`/events/${row.eventId}`} className="font-medium hover:underline">
                        {row.eventName}
                      </Link>
                    </TableCell>
                    <TableCell>{row.currencyCode}</TableCell>
                    <TableCell>{formatMoney(row.revenue, row.currencyCode)}</TableCell>
                    <TableCell>{formatMoney(row.expenses, row.currencyCode)}</TableCell>
                    <TableCell className={row.profit >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatMoney(row.profit, row.currencyCode)}
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
