"use client";

import { useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notifications/actions/mark-read";

export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

const TYPE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  info: "secondary",
  success: "default",
  warning: "outline",
  error: "destructive",
};

export function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = (id: string) => {
    startTransition(async () => {
      try {
        await markNotificationReadAction(id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update notification");
      }
    });
  };

  const markAllRead = () => {
    startTransition(async () => {
      try {
        await markAllNotificationsReadAction();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update notifications");
      }
    });
  };

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{unreadCount} unread</p>
        <Button variant="outline" size="sm" onClick={markAllRead} disabled={isPending || unreadCount === 0}>
          <CheckCheck />
          Mark all read
        </Button>
      </div>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
            <Bell className="size-6" />
            You&apos;re all caught up.
          </CardContent>
        </Card>
      )}

      {notifications.map((notification) => (
        <Card key={notification.id} className={notification.isRead ? "opacity-70" : undefined}>
          <CardContent className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge variant={TYPE_VARIANT[notification.type] ?? "secondary"}>
                  {notification.type}
                </Badge>
                <p className="font-medium">{notification.title}</p>
              </div>
              {notification.body && (
                <p className="text-muted-foreground text-sm">{notification.body}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>
            {!notification.isRead && (
              <Button variant="ghost" size="sm" onClick={() => markRead(notification.id)}>
                Mark read
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
