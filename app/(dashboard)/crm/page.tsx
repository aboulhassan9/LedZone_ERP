import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CrmDashboardPage() {
  await requirePermission("crm.view");

  const supabase = await createClient();

  const [leadResult, prospectResult, activeResult, draftQuotesResult, sentQuotesResult, acceptedQuotesResult] =
    await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("lifecycle_stage", "lead"),
      supabase.from("customers").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("lifecycle_stage", "prospect"),
      supabase.from("customers").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("lifecycle_stage", "active"),
      supabase.from("quotes").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "draft"),
      supabase.from("quotes").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "sent"),
      supabase.from("quotes").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "accepted"),
    ]);

  const kpis = [
    { label: "Leads", value: leadResult.count ?? 0, href: "/crm/customers" },
    { label: "Prospects", value: prospectResult.count ?? 0, href: "/crm/customers" },
    { label: "Active customers", value: activeResult.count ?? 0, href: "/crm/customers" },
    { label: "Draft quotes", value: draftQuotesResult.count ?? 0, href: "/crm/quotes" },
    { label: "Sent quotes", value: sentQuotesResult.count ?? 0, href: "/crm/quotes" },
    { label: "Accepted quotes", value: acceptedQuotesResult.count ?? 0, href: "/crm/quotes" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM dashboard</h1>
        <p className="text-muted-foreground text-sm">Customers, contacts, and quotes.</p>
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
