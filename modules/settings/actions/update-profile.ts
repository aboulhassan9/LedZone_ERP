"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { updateProfileSchema } from "@/modules/settings/schemas/profile-schema";

export type UpdateProfileState = {
  error?: string;
  success?: boolean;
};

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      updated_by: user.id,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await supabase.rpc("log_audit_event", {
    p_action: "profile.updated",
    p_entity_type: "profiles",
    p_entity_id: user.id,
  });

  revalidatePath("/settings/profile");
  return { success: true };
}
