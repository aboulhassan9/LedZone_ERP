"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createCrewMemberSchema, type CreateCrewMemberInput } from "@/modules/planning/schemas/resource-assignment-schema";
import { createCrewMemberAction, updateCrewMemberAction } from "@/modules/planning/actions/resource-actions";
import type { CrewMemberRow } from "@/modules/planning/repositories/resource-assignment-repository";

export function CrewMemberFormDialog({
  crewMember,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  crewMember?: CrewMemberRow;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!crewMember;

  const form = useForm<CreateCrewMemberInput>({
    resolver: zodResolver(createCrewMemberSchema),
    defaultValues: {
      fullName: crewMember?.full_name ?? "",
      role: crewMember?.role ?? undefined,
      phone: crewMember?.phone ?? undefined,
      email: crewMember?.email ?? undefined,
    },
  });

  async function onSubmit(values: CreateCrewMemberInput) {
    const result = isEdit
      ? await updateCrewMemberAction(crewMember!.id, values)
      : await createCrewMemberAction(values);

    if (result.success) {
      toast.success(isEdit ? "Crew member updated" : "Crew member added");
      setOpen(false);
      form.reset();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus />
              New crew member
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit crew member" : "Add a crew member"}</DialogTitle>
          <DialogDescription>Kept minimal — just enough to book them against a plan.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="e.g. Rigger, Driver, Technician" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add crew member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
