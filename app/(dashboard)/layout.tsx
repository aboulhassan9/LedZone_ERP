import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile, getCurrentUserPermissionKeys } from "@/lib/auth/permissions";
import { AuthProvider } from "@/providers/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, permissionKeys] = await Promise.all([
    getCurrentProfile(),
    getCurrentUserPermissionKeys(),
  ]);

  return (
    <AuthProvider user={user} profile={profile} permissionKeys={permissionKeys}>
      <div className="flex min-h-screen flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
