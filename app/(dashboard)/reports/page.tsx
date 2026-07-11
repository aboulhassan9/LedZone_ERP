import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REPORTS = [
  { href: "/reports/inventory", title: "Inventory utilization", description: "Equipment status breakdown and per-model utilization." },
  { href: "/reports/financials", title: "Financials", description: "Revenue from paid invoices vs. approved/paid expenses, by currency." },
  { href: "/reports/event-profitability", title: "Event profitability", description: "Revenue minus cost per event, by currency." },
];

export default async function ReportsPage() {
  await requirePermission("reports.view");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">Cross-module reporting and dashboards.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="hover:border-primary/50 h-full transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{report.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{report.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
