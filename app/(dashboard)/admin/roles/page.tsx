import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { RoleTable } from "@/modules/roles/components/role-table";
import { CreateRoleDialog } from "@/modules/roles/components/create-role-dialog";
import type { RoleRow } from "@/modules/roles/types";

export default async function RolesPage() {
  await requirePermission("roles.manage");

  const supabase = await createClient();

  const [{ data: roles }, { data: permissions }, { data: rolePermissions }] = await Promise.all([
    supabase
      .from("roles")
      .select("id, name, description, is_system")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("permissions").select("id, key, module, action, description").order("module"),
    supabase.from("role_permissions").select("role_id, permission_id"),
  ]);

  const permissionIdsByRole = new Map<string, string[]>();
  for (const rp of rolePermissions ?? []) {
    const list = permissionIdsByRole.get(rp.role_id) ?? [];
    list.push(rp.permission_id);
    permissionIdsByRole.set(rp.role_id, list);
  }

  const roleRows: RoleRow[] = (roles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.is_system,
    permissionIds: permissionIdsByRole.get(r.id) ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm">
            Define what each role at LED Zone is allowed to do.
          </p>
        </div>
        <CreateRoleDialog />
      </div>
      <RoleTable roles={roleRows} permissions={permissions ?? []} />
    </div>
  );
}
