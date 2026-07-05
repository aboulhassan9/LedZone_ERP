"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleUserStatusAction } from "@/modules/users/actions/toggle-user-status";
import { ManageRolesDialog } from "@/modules/users/components/manage-roles-dialog";
import type { RoleOption, UserRow } from "@/modules/users/types";

export function UserTable({
  users,
  roles,
  currentUserId,
}: {
  users: UserRow[];
  roles: RoleOption[];
  currentUserId: string;
}) {
  const [managingUser, setManagingUser] = useState<UserRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const roleNameById = new Map(roles.map((r) => [r.id, r.name]));

  const toggleStatus = (user: UserRow) => {
    const next = user.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      try {
        await toggleUserStatusAction(user.id, next);
        toast.success(`${user.fullName} is now ${next}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update status");
      }
    });
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.fullName}</TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.roleIds.length === 0 && (
                    <span className="text-muted-foreground text-xs">No roles</span>
                  )}
                  {user.roleIds.map((roleId) => (
                    <Badge key={roleId} variant="secondary">
                      {roleNameById.get(roleId) ?? "Unknown"}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.status === "active" ? "default" : "outline"}>
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setManagingUser(user)}>
                      Manage roles
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={user.id === currentUserId || isPending}
                      onSelect={() => toggleStatus(user)}
                      variant={user.status === "active" ? "destructive" : "default"}
                    >
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {managingUser && (
        <ManageRolesDialog
          user={managingUser}
          roles={roles}
          open={!!managingUser}
          onOpenChange={(open) => !open && setManagingUser(null)}
        />
      )}
    </>
  );
}
