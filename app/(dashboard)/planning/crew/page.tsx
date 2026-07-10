import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CrewTable } from "@/modules/planning/components/crew/crew-table";
import { CrewMemberFormDialog } from "@/modules/planning/components/crew/crew-form-dialog";
import type { CrewMemberRow } from "@/modules/planning/repositories/resource-assignment-repository";

export default async function CrewPage() {
  await requirePermission("planning.view");

  const supabase = await createClient();
  const [{ data: crewMembers }, canManage] = await Promise.all([
    supabase
      .from("crew_members")
      .select("id, full_name, role, phone, email, is_active")
      .is("deleted_at", null)
      .order("full_name"),
    hasPermission("planning.manage").then((v) => v || hasPermission("planning.assign.crew")),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Crew</h1>
          <p className="text-muted-foreground text-sm">A minimal directory for booking crew against plans.</p>
        </div>
        {canManage && <CrewMemberFormDialog />}
      </div>
      <CrewTable crewMembers={(crewMembers ?? []) as CrewMemberRow[]} />
    </div>
  );
}
