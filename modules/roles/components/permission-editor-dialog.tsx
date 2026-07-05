"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setRolePermissionsAction } from "@/modules/roles/actions/set-role-permissions";
import type { PermissionOption, RoleRow } from "@/modules/roles/types";

export function PermissionEditorDialog({
  role,
  permissions,
  open,
  onOpenChange,
}: {
  role: RoleRow;
  permissions: PermissionOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<string[]>(role.permissionIds);
  const [isPending, startTransition] = useTransition();

  const grouped = permissions.reduce<Record<string, PermissionOption[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((p) => p !== id)));
  };

  const save = () => {
    startTransition(async () => {
      try {
        await setRolePermissionsAction(role.id, selected);
        toast.success(`Updated permissions for ${role.name}`);
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update permissions");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissions for {role.name}</DialogTitle>
          <DialogDescription>
            Choose what this role can do. Future modules will add more permission groups here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {Object.entries(grouped).map(([module, perms]) => (
            <div key={module} className="grid gap-2">
              <p className="text-sm font-medium capitalize">{module.replace(/_/g, " ")}</p>
              {perms.map((permission) => (
                <div key={permission.id} className="flex items-center gap-2 pl-2">
                  <Checkbox
                    id={`perm-${permission.id}`}
                    checked={selected.includes(permission.id)}
                    onCheckedChange={(checked) => toggle(permission.id, checked === true)}
                  />
                  <Label htmlFor={`perm-${permission.id}`} className="font-normal">
                    {permission.description ?? permission.key}
                  </Label>
                </div>
              ))}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
