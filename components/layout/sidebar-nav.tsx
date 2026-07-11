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
  Boxes,
  Tags,
  Factory,
  Truck,
  Warehouse,
  Layers,
  Package,
  ShoppingCart,
  Droplets,
  Building2,
  Network,
  ArrowLeftRight,
  PackagePlus,
  PackageMinus,
  ListChecks,
  CalendarClock,
  ClipboardCheck,
  ScanLine,
  CalendarRange,
  Users2,
  Car,
  Contact,
  FileText,
  CalendarDays,
  FileSignature,
  Receipt,
  Wallet,
  Wrench,
  UserSquare2,
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
    title: "CRM",
    items: [
      { href: "/crm", label: "Dashboard", icon: LayoutDashboard, permission: "crm.view" },
      { href: "/crm/customers", label: "Customers", icon: Contact, permission: "crm.view" },
      { href: "/crm/quotes", label: "Quotes", icon: FileText, permission: "crm.view" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { href: "/inventory", label: "Dashboard", icon: LayoutDashboard, permission: "inventory.view" },
      { href: "/inventory/items", label: "Equipment Items", icon: Boxes, permission: "inventory.view" },
      { href: "/inventory/models", label: "Equipment Models", icon: Layers, permission: "inventory.view" },
      { href: "/inventory/categories", label: "Categories", icon: Tags, permission: "inventory.view" },
      { href: "/inventory/manufacturers", label: "Manufacturers", icon: Factory, permission: "inventory.view" },
      { href: "/inventory/brands", label: "Brands", icon: Package, permission: "inventory.view" },
      { href: "/inventory/suppliers", label: "Suppliers", icon: Truck, permission: "inventory.view" },
      {
        href: "/inventory/storage-locations",
        label: "Storage Locations",
        icon: Warehouse,
        permission: "inventory.view",
      },
      { href: "/inventory/purchases", label: "Purchase Records", icon: ShoppingCart, permission: "inventory.view" },
      { href: "/inventory/consumables", label: "Consumables", icon: Droplets, permission: "inventory.view" },
    ],
  },
  {
    title: "Warehouse",
    items: [
      { href: "/warehouse", label: "Dashboard", icon: LayoutDashboard, permission: "warehouse.view" },
      { href: "/warehouse/scan", label: "Scan", icon: ScanLine, permission: "warehouse.view" },
      { href: "/warehouse/warehouses", label: "Warehouses", icon: Building2, permission: "warehouse.view" },
      { href: "/warehouse/locations", label: "Location Explorer", icon: Network, permission: "warehouse.view" },
      { href: "/warehouse/transfers", label: "Transfers", icon: ArrowLeftRight, permission: "warehouse.view" },
      { href: "/warehouse/receiving", label: "Receiving", icon: PackagePlus, permission: "warehouse.view" },
      { href: "/warehouse/dispatch", label: "Dispatch", icon: PackageMinus, permission: "warehouse.view" },
      { href: "/warehouse/picking", label: "Picking", icon: ListChecks, permission: "warehouse.view" },
      { href: "/warehouse/reservations", label: "Reservations", icon: CalendarClock, permission: "warehouse.view" },
      { href: "/warehouse/cycle-counts", label: "Cycle Counts", icon: ClipboardCheck, permission: "warehouse.view" },
      { href: "/warehouse/bulk-move", label: "Bulk Move", icon: Boxes, permission: "warehouse.view" },
    ],
  },
  {
    title: "Planning",
    items: [
      { href: "/planning", label: "Dashboard", icon: LayoutDashboard, permission: "planning.view" },
      { href: "/planning/plans", label: "Equipment Plans", icon: CalendarRange, permission: "planning.view" },
      { href: "/planning/crew", label: "Crew", icon: Users2, permission: "planning.view" },
      { href: "/planning/vehicles", label: "Vehicles", icon: Car, permission: "planning.view" },
    ],
  },
  {
    title: "Events",
    items: [{ href: "/events", label: "Events", icon: CalendarDays, permission: "events.view" }],
  },
  {
    title: "Rental",
    items: [{ href: "/rental", label: "Agreements", icon: FileSignature, permission: "rental.view" }],
  },
  {
    title: "Finance",
    items: [
      { href: "/finance", label: "Dashboard", icon: LayoutDashboard, permission: "finance.view" },
      { href: "/finance/invoices", label: "Invoices", icon: Receipt, permission: "finance.view" },
      { href: "/finance/expenses", label: "Expenses", icon: Wallet, permission: "finance.view" },
    ],
  },
  {
    title: "Fleet",
    items: [{ href: "/fleet", label: "Vehicles", icon: Wrench, permission: "fleet.view" }],
  },
  {
    title: "HR",
    items: [{ href: "/hr", label: "Employees", icon: UserSquare2, permission: "hr.view" }],
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
