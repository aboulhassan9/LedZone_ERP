import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { financialSnapshotRepository } from "@/modules/reports/repositories/financial-snapshot-repository";
import { getPreviousMonthRange } from "@/modules/reports/lib/period";

// Fired by Vercel Cron (see vercel.json) on the 1st of each month. Generates the report for
// the month that just ended, not the month in progress. See weekly/route.ts for the full
// rationale on the service-role client and CRON_SECRET requirement -- identical here.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = getPreviousMonthRange();
  const supabase = createAdminClient();
  const rows = await financialSnapshotRepository.computeAndStore(supabase, "monthly", start, end, null);

  return NextResponse.json({ periodStart: start, periodEnd: end, currenciesReported: rows.length });
}
