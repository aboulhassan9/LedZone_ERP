import { DocumentsError } from "@/modules/documents/errors";
import type { ActionResult } from "@/modules/warehouse/types/action-result";

// Mirrors modules/crm/shared/run-action.ts exactly, including reuse of Warehouse's plain
// ActionResult<T> type.
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (error instanceof DocumentsError) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
    throw error;
  }
}
