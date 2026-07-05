import { getCurrentUser } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { NotificationList, type NotificationRow } from "@/modules/notifications/components/notification-list";

export default async function NotificationsSettingsPage() {
  const user = await getCurrentUser();

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, type, link_url, is_read, created_at")
    .eq("user_id", user?.id ?? "")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications: NotificationRow[] = (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    linkUrl: n.link_url,
    isRead: n.is_read,
    createdAt: n.created_at,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm">Updates relevant to you.</p>
      </div>
      <NotificationList notifications={notifications} />
    </div>
  );
}
