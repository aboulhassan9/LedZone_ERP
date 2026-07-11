import "server-only";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/modules/reports/shared/authorize";
import { logReportsAudit } from "@/modules/reports/shared/audit";
import { toReportsError } from "@/modules/reports/errors";
import {
  generateFinancialSnapshotSchema,
  type GenerateFinancialSnapshotInput,
} from "@/modules/reports/schemas/financial-snapshot-schema";
import {
  financialSnapshotRepository,
  type FinancialReportRow,
} from "@/modules/reports/repositories/financial-snapshot-repository";
import { getWeekRange, getMonthRange } from "@/modules/reports/lib/period";

async function generateSnapshot(input: GenerateFinancialSnapshotInput): Promise<FinancialReportRow[]> {
  const userId = await assertPermission("finance.manage");
  const parsed = generateFinancialSnapshotSchema.parse(input);

  const reference = new Date(`${parsed.referenceDate}T00:00:00Z`);
  const { start, end } = parsed.periodType === "weekly" ? getWeekRange(reference) : getMonthRange(reference);

  try {
    const supabase = await createClient();
    const rows = await financialSnapshotRepository.computeAndStore(supabase, parsed.periodType, start, end, userId);
    await logReportsAudit("financial_report.generated", "financial_reports", null, {
      periodType: parsed.periodType,
      periodStart: start,
      periodEnd: end,
      currencyCount: rows.length,
    });
    return rows;
  } catch (error) {
    throw toReportsError(error, "Financial report");
  }
}

async function listSnapshots(): Promise<FinancialReportRow[]> {
  await assertPermission("reports.view");
  return financialSnapshotRepository.list();
}

export const financialSnapshotService = { generateSnapshot, listSnapshots };
