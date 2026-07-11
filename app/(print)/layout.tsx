import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/permissions";

// Deliberately skips the (dashboard) group's Sidebar/Topbar chrome — these are printable
// label pages meant to fill the page with nothing but the label. Same auth gate as
// (dashboard)/layout.tsx (redirect to /login), but no AuthProvider: nothing under this
// group renders permission-gated interactive UI, so the client-side permission context
// isn't needed.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <div className="p-6 print:p-0">{children}</div>;
}
