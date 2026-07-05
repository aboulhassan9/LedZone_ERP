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
import { setUserRolesAction } from "@/modules/users/actions/set-user-roles";
import type { RoleOption, UserRow } from "@/modules/users/types";

export function ManageRolesDialog({
  user,
  roles,
  open,
  onOpenChange,
}: {
  user: UserRow;
  roles: RoleOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<string[]>(user.roleIds);
  const [isPending, startTransition] = useTransition();

  const toggle = (roleId: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)));
  };

  const save = () => {
    startTransition(async () => {
      try {
        await setUserRolesAction(user.id, selected);
        toast.success(`Updated roles for ${user.fullName}`);
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update roles");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage roles</DialogTitle>
          <DialogDescription>{user.fullName}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center gap-2">
              <Checkbox
                id={`role-${role.id}`}
                checked={selected.includes(role.id)}
                onCheckedChange={(checked) => toggle(role.id, checked === true)}
              />
              <Label htmlFor={`role-${role.id}`} className="font-normal">
                {role.name}
              </Label>
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
