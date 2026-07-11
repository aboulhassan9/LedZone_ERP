import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PlanningDashboardPage() {
  await requirePermission("planning.view");

  const supabase = await createClient();

  const [
    draftResult,
    planningResult,
    readyResult,
    approvedResult,
    preparedResult,
    loadedResult,
    blockingConflictsResult,
    unresolvedShortagesResult,
    upcomingResult,
  ] = await Promise.all([
    supabase.from("equipment_plans").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "draft"),
    supabase.from("equipment_plans").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "planning"),
    supabase.from("equipment_plans").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "ready"),
    supabase.from("equipment_plans").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "approved"),
    supabase.from("equipment_plans").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "prepared"),
    supabase.from("equipment_plans").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "loaded"),
    supabase
      .from("equipment_conflicts")
      .select("*", { count: "exact", head: true })
      .eq("severity", "blocking")
      .is("resolved_at", null),
    supabase.from("equipment_shortages").select("*", { count: "exact", head: true }).is("resolved_at", null),
    supabase
      .from("equipment_plans")
      .select("id, name, event_start_at, status")
      .is("deleted_at", null)
      .not("status", "in", "(completed,cancelled)")
      .order("event_start_at", { ascending: true })
      .limit(5),
  ]);

  const kpis = [
    { label: "Draft", value: draftResult.count ?? 0, href: "/planning/plans?status=draft" },
    { label: "Planning", value: planningResult.count ?? 0, href: "/planning/plans?status=planning" },
    { label: "Ready", value: readyResult.count ?? 0, href: "/planning/plans?status=ready" },
    { label: "Approved", value: approvedResult.count ?? 0, href: "/planning/plans?status=approved" },
    { label: "Prepared", value: preparedResult.count ?? 0, href: "/planning/plans?status=prepared" },
    { label: "Loaded", value: loadedResult.count ?? 0, href: "/planning/plans?status=loaded" },
    { label: "Blocking conflicts", value: blockingConflictsResult.count ?? 0, href: "/planning/plans" },
    { label: "Unresolved shortages", value: unresolvedShortagesResult.count ?? 0, href: "/planning/plans" },
  ];

  const upcoming = upcomingResult.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planning dashboard</h1>
        <p className="text-muted-foreground text-sm">Resource Planning &amp; Scheduling Engine.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Upcoming plans</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active plans.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((plan) => (
                <li key={plan.id} className="flex items-center justify-between text-sm">
                  <Link href={`/planning/plans/${plan.id}`} className="font-medium hover:underline">
                    {plan.name}
                  </Link>
                  <span className="text-muted-foreground">{new Date(plan.event_start_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
