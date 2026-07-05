"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth/permissions";
import { createRoleSchema } from "@/modules/roles/schemas/role-schema";

export type CreateRoleState = {
  error?: string;
  success?: boolean;
};

export async function createRoleAction(
  _prevState: CreateRoleState,
  formData: FormData
): Promise<CreateRoleState> {
  if (!(await hasPermission("roles.manage"))) {
    return { error: "You don't have permission to manage roles." };
  }

  const parsed = createRoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: role, error } = await supabase
    .from("roles")
    .insert({ name: parsed.data.name, description: parsed.data.description })
    .select("id")
    .single();

  if (error) {
    return { error: error.code === "23505" ? "A role with this name already exists." : error.message };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "role.created",
    p_entity_type: "roles",
    p_entity_id: role.id,
    p_changes: parsed.data,
  });

  revalidatePath("/admin/roles");
  return { success: true };
}
