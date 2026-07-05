import Link from "next/link";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function Sidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-64 shrink-0 border-r md:flex md:flex-col">
      <Link href="/dashboard" className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        LED Zone ERP
      </Link>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}
