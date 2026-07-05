"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionEditorDialog } from "@/modules/roles/components/permission-editor-dialog";
import type { PermissionOption, RoleRow } from "@/modules/roles/types";

export function RoleTable({
  roles,
  permissions,
}: {
  roles: RoleRow[];
  permissions: PermissionOption[];
}) {
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">
                {role.name}
                {role.isSystem && (
                  <Badge variant="outline" className="ml-2">
                    System
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{role.description}</TableCell>
              <TableCell className="text-muted-foreground">
                {role.permissionIds.length} granted
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => setEditingRole(role)}>
                  Edit permissions
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingRole && (
        <PermissionEditorDialog
          role={editingRole}
          permissions={permissions}
          open={!!editingRole}
          onOpenChange={(open) => !open && setEditingRole(null)}
        />
      )}
    </>
  );
}
