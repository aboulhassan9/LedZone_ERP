import { PlanningError } from "@/modules/planning/errors";
import type { ActionResult } from "@/modules/warehouse/types/action-result";

// The boundary between the Service Layer (throws PlanningError) and Server Actions (return a
// typed result). Domain errors become a typed failure; anything else is an unexpected bug and
// is re-thrown so Next.js's own error handling surfaces it. ActionResult<T> is reused directly
// from Warehouse (a plain generic type, no WarehouseError coupling) rather than redeclared.
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (error instanceof PlanningError) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
    throw error;
  }
}
