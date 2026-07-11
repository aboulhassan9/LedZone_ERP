import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FinanceDashboardPage() {
  await requirePermission("finance.view");

  const supabase = await createClient();

  const [draftInvoicesResult, sentInvoicesResult, paidInvoicesResult, draftExpensesResult, approvedExpensesResult] =
    await Promise.all([
      supabase.from("invoices").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "draft"),
      supabase.from("invoices").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "sent"),
      supabase.from("invoices").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "paid"),
      supabase.from("expenses").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "draft"),
      supabase.from("expenses").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "approved"),
    ]);

  const kpis = [
    { label: "Draft invoices", value: draftInvoicesResult.count ?? 0, href: "/finance/invoices" },
    { label: "Sent invoices", value: sentInvoicesResult.count ?? 0, href: "/finance/invoices" },
    { label: "Paid invoices", value: paidInvoicesResult.count ?? 0, href: "/finance/invoices" },
    { label: "Draft expenses", value: draftExpensesResult.count ?? 0, href: "/finance/expenses" },
    { label: "Approved expenses", value: approvedExpensesResult.count ?? 0, href: "/finance/expenses" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finance dashboard</h1>
        <p className="text-muted-foreground text-sm">Invoices, payments, and expenses.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-normal">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{kpi.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
