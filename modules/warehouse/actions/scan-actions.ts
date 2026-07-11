"use server";

import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { scanService, type ScanResult } from "@/modules/warehouse/services/scan-service";

export async function resolveScanAction(codeValue: string): Promise<ActionResult<ScanResult>> {
  return runAction(() => scanService.resolveScan(codeValue));
}
