"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, getCurrentUser } from "@/lib/auth/permissions";

export async function toggleUserStatusAction(userId: string, nextStatus: "active" | "inactive") {
  if (!(await hasPermission("users.manage"))) {
    throw new Error("You don't have permission to manage users.");
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.id === userId) {
    throw new Error("You can't change your own status.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: nextStatus, updated_by: currentUser?.id })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  await supabase.rpc("log_audit_event", {
    p_action: nextStatus === "active" ? "user.activated" : "user.deactivated",
    p_entity_type: "profiles",
    p_entity_id: userId,
  });

  revalidatePath("/admin/users");
}
