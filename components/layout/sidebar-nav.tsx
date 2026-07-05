"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Bell,
  FolderOpen,
  Users,
  ShieldCheck,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings/profile", label: "Profile", icon: User },
      { href: "/settings/notifications", label: "Notifications", icon: Bell },
      { href: "/settings/files", label: "Files", icon: FolderOpen },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, permission: "users.manage" },
      { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "roles.manage" },
      { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText, permission: "audit.view" },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  return (
    <nav className="flex flex-col gap-6 p-4">
      {SECTIONS.map((section) => {
        const items = section.items.filter((item) => !item.permission || hasPermission(item.permission));
        if (items.length === 0) return null;

        return (
          <div key={section.title} className="flex flex-col gap-1">
            <p className="text-muted-foreground px-2 text-xs font-medium uppercase tracking-wide">
              {section.title}
            </p>
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
