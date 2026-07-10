import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { PermissionDeniedError } from "@/modules/planning/errors";

// Service-layer permission check: throws instead of redirecting (unlike
// lib/auth/permissions.ts's requirePermission, which is a UI/route guard). Mirrors
// modules/warehouse/shared/authorize.ts exactly — Planning keeps its own copy rather than
// refactoring Inventory's/Warehouse's, per the explicit "do not modify existing modules"
// requirement for this step.
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

// Passes if the caller holds ANY of the given keys — mirrors the "manage OR narrower
// permission" pattern used throughout the RLS policies and transactional functions (e.g.
// planning.manage OR planning.approve).
export async function assertAnyPermission(keys: string[]): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new PermissionDeniedError("You must be signed in.");

  const supabase = await createClient();
  for (const key of keys) {
    const { data, error } = await supabase.rpc("has_permission", {
      p_user_id: user.id,
      p_key: key,
    });
    if (!error && data) return user.id;
  }

  throw new PermissionDeniedError();
}

// Read-only check (no throw) — used where a service needs to branch behavior rather than
// reject the whole action.
export async function hasPermission(key: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", {
    p_user_id: user.id,
    p_key: key,
  });
  return !error && Boolean(data);
}
