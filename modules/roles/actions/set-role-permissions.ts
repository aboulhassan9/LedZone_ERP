"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth/permissions";

export async function setRolePermissionsAction(roleId: string, permissionIds: string[]) {
  if (!(await hasPermission("roles.manage"))) {
    throw new Error("You don't have permission to manage roles.");
  }

  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", roleId);

  if (currentError) throw new Error(currentError.message);

  const currentIds = new Set((current ?? []).map((r) => r.permission_id));
  const nextIds = new Set(permissionIds);

  const toAdd = permissionIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("role_permissions")
      .insert(toAdd.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })));
    if (error) throw new Error(error.message);
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .in("permission_id", toRemove);
    if (error) throw new Error(error.message);
  }

  if (toAdd.length > 0 || toRemove.length > 0) {
    await supabase.rpc("log_audit_event", {
      p_action: "role.permissions_updated",
      p_entity_type: "roles",
      p_entity_id: roleId,
      p_changes: { added: toAdd, removed: toRemove },
    });
  }

  revalidatePath("/admin/roles");
}
