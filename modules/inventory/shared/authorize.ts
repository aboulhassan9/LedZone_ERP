import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { PermissionDeniedError } from "@/modules/inventory/errors";

// Service-layer permission check: throws instead of redirecting (unlike
// lib/auth/permissions.ts's requirePermission, which is a UI/route guard). Services must
// be safely callable from anywhere — future modules, background jobs, other services —
// none of which have a Next.js response to redirect.
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

// Same as assertPermission, but passes if the caller holds ANY of the given keys —
// mirrors the "manage OR narrower permission" pattern used throughout the RLS policies
// and transactional functions (e.g. inventory.manage OR inventory.maintenance.manage).
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
