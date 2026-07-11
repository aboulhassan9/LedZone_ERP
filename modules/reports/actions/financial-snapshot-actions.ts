"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/reports/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { financialSnapshotService } from "@/modules/reports/services/financial-snapshot-service";
import type { GenerateFinancialSnapshotInput } from "@/modules/reports/schemas/financial-snapshot-schema";
import type { FinancialReportRow } from "@/modules/reports/repositories/financial-snapshot-repository";

export async function generateFinancialSnapshotAction(
  input: GenerateFinancialSnapshotInput
): Promise<ActionResult<FinancialReportRow[]>> {
  const result = await runAction(() => financialSnapshotService.generateSnapshot(input));
  revalidatePath("/reports/financial-history");
  return result;
}

export async function listFinancialSnapshotsAction(): Promise<ActionResult<FinancialReportRow[]>> {
  return runAction(() => financialSnapshotService.listSnapshots());
}
