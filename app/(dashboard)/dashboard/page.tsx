import { getCurrentUserPermissionKeys } from "@/lib/auth/permissions";
import { DashboardOverview } from "@/modules/dashboard/components/dashboard-overview";

export default async function DashboardPage() {
  const permissionKeys = await getCurrentUserPermissionKeys();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of LED Zone ERP.</p>
      </div>
      <DashboardOverview permissionKeys={permissionKeys} />
    </div>
  );
}
