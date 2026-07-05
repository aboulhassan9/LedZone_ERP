"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { inviteUserSchema } from "@/modules/users/schemas/invite-user-schema";

export type InviteUserState = {
  error?: string;
  success?: boolean;
};

export async function inviteUserAction(
  _prevState: InviteUserState,
  formData: FormData
): Promise<InviteUserState> {
  if (!(await hasPermission("users.manage"))) {
    return { error: "You don't have permission to invite users." };
  }

  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, fullName, roleId } = parsed.data;

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (inviteError || !invited.user) {
    return { error: inviteError?.message ?? "Failed to invite user." };
  }

  const supabase = await createClient();

  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: invited.user.id, role_id: roleId });

  if (roleError) {
    return { error: `User invited, but role assignment failed: ${roleError.message}` };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "user.invited",
    p_entity_type: "profiles",
    p_entity_id: invited.user.id,
    p_changes: { email, full_name: fullName, role_id: roleId },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
