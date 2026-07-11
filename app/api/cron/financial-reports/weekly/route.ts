import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { financialSnapshotRepository } from "@/modules/reports/repositories/financial-snapshot-repository";
import { getPreviousWeekRange } from "@/modules/reports/lib/period";

// Fired by Vercel Cron (see vercel.json) every Monday. Generates the report for the week that
// just ended (Mon-Sun), not the week in progress. Uses the service-role client
// (lib/supabase/admin.ts) since a cron invocation has no user session for RLS to check --
// generated_by is left null on these rows to reflect that honestly.
//
// Requires CRON_SECRET to be set in the deployment's environment variables. Vercel Cron sends
// `Authorization: Bearer $CRON_SECRET` automatically once that variable exists; without it,
// this route (correctly) refuses every request, including Vercel's own.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = getPreviousWeekRange();
  const supabase = createAdminClient();
  const rows = await financialSnapshotRepository.computeAndStore(supabase, "weekly", start, end, null);

  return NextResponse.json({ periodStart: start, periodEnd: end, currenciesReported: rows.length });
}
