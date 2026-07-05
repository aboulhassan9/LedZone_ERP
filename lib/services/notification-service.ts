import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotifyInput = {
  userId: string;
  title: string;
  body?: string;
  type?: "info" | "success" | "warning" | "error";
  linkUrl?: string;
};

// Central entry point every module uses to notify a user — goes through the service-role
// client so callers don't need 'notifications.manage' themselves (they've typically
// already been authorized to perform the action that triggers the notification).
export async function notify({ userId, title, body, type = "info", linkUrl }: NotifyInput) {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type,
    link_url: linkUrl,
  });

  if (error) throw new Error(`Failed to create notification: ${error.message}`);
}
