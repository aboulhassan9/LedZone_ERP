"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { transferEquipmentItemSchema } from "@/modules/inventory/schemas/equipment-item-schema";
import {
  transferEquipmentItemAction,
  checkOutEquipmentItemAction,
  checkInEquipmentItemAction,
} from "@/modules/inventory/actions/equipment-item-actions";

type MovementKind = "transfer" | "check_out" | "check_in";

const CONFIG: Record<MovementKind, { label: string; icon: typeof ArrowRightLeft }> = {
  transfer: { label: "Transfer", icon: ArrowRightLeft },
  check_out: { label: "Check out", icon: LogOut },
  check_in: { label: "Check in", icon: LogIn },
};

export const MOVEMENT_PERMISSION: Record<MovementKind, string> = {
  transfer: "inventory.transfer",
  check_out: "inventory.checkout",
  check_in: "inventory.checkin",
};

const ACTION_BY_KIND = {
  transfer: transferEquipmentItemAction,
  check_out: checkOutEquipmentItemAction,
  check_in: checkInEquipmentItemAction,
};

export function ItemMovementDialog({
  itemId,
  kind,
  storageLocations,
}: {
  itemId: string;
  kind: MovementKind;
  storageLocations: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { label, icon: Icon } = CONFIG[kind];

  const form = useForm({
    resolver: zodResolver(transferEquipmentItemSchema),
    defaultValues: { toStorageLocationId: "", referenceNote: undefined },
  });

  async function onSubmit(values: { toStorageLocationId: string; referenceNote?: string }) {
    const action = ACTION_BY_KIND[kind];
    const result = await action(itemId, values);
    if (result.success) {
      toast.success(`${label} recorded`);
      setOpen(false);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icon />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label} equipment item</DialogTitle>
          <DialogDescription>This records a movement in the item&apos;s history.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="toStorageLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination location</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {storageLocations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referenceNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : label}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
