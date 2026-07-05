"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth/permissions";

export async function setUserRolesAction(userId: string, roleIds: string[]) {
  if (!(await hasPermission("users.manage"))) {
    throw new Error("You don't have permission to manage users.");
  }

  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);

  if (currentError) throw new Error(currentError.message);

  const currentRoleIds = new Set((current ?? []).map((r) => r.role_id));
  const nextRoleIds = new Set(roleIds);

  const toAdd = roleIds.filter((id) => !currentRoleIds.has(id));
  const toRemove = [...currentRoleIds].filter((id) => !nextRoleIds.has(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("user_roles")
      .insert(toAdd.map((roleId) => ({ user_id: userId, role_id: roleId })));
    if (error) throw new Error(error.message);
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role_id", toRemove);
    if (error) throw new Error(error.message);
  }

  if (toAdd.length > 0 || toRemove.length > 0) {
    await supabase.rpc("log_audit_event", {
      p_action: "user.roles_updated",
      p_entity_type: "profiles",
      p_entity_id: userId,
      p_changes: { added: toAdd, removed: toRemove },
    });
  }

  revalidatePath("/admin/users");
}
