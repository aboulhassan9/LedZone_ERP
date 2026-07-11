"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { addSignatureSchema, type AddSignatureInput } from "@/modules/documents/schemas/signature-schema";
import { addSignatureAction } from "@/modules/documents/actions/document-actions";

export function AddSignatureDialog({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof addSignatureSchema>, unknown, AddSignatureInput>({
    resolver: zodResolver(addSignatureSchema),
    defaultValues: { signerName: "" },
  });

  async function onSubmit(values: AddSignatureInput) {
    const result = await addSignatureAction(documentId, values);
    if (result.success) {
      toast.success("Signature recorded");
      setOpen(false);
      form.reset({ signerName: "" });
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PenLine /> Record signature
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a signature</DialogTitle>
          <DialogDescription>
            An internal record of who signed and when — not a cryptographic or legally-binding
            e-signature.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="signerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signer name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="signerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signer email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Recording..." : "Record signature"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
