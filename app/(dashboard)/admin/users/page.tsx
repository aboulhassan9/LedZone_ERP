import { requirePermission, getCurrentUser } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserTable } from "@/modules/users/components/user-table";
import { InviteUserDialog } from "@/modules/users/components/invite-user-dialog";
import type { UserRow } from "@/modules/users/types";

export default async function UsersPage() {
  await requirePermission("users.manage");
  const currentUser = await getCurrentUser();

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: roles }, { data: userRoles }, { data: authUsers }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, status").order("created_at"),
      supabase.from("roles").select("id, name").is("deleted_at", null).order("name"),
      supabase.from("user_roles").select("user_id, role_id"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email ?? null]) ?? []);
  const roleIdsByUser = new Map<string, string[]>();
  for (const ur of userRoles ?? []) {
    const list = roleIdsByUser.get(ur.user_id) ?? [];
    list.push(ur.role_id);
    roleIdsByUser.set(ur.user_id, list);
  }

  const users: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: emailById.get(p.id) ?? null,
    status: p.status,
    roleIds: roleIdsByUser.get(p.id) ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm">
            Invite teammates and manage their roles at LED Zone.
          </p>
        </div>
        <InviteUserDialog roles={roles ?? []} />
      </div>
      <UserTable users={users} roles={roles ?? []} currentUserId={currentUser?.id ?? ""} />
    </div>
  );
}
