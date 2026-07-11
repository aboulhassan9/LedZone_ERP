import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { PermissionDeniedError } from "@/modules/reports/errors";

// Mirrors modules/crm/shared/authorize.ts exactly — Reports keeps its own copy rather than a
// cross-module refactor, same decision made throughout this codebase.
export async function assertPermission(key: string): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new PermissionDeniedError("You must be signed in.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", {
    p_user_id: user.id,
    p_key: key,
  });

  if (error || !data) throw new PermissionDeniedError();
  return user.id;
}
