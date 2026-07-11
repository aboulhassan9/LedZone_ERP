"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  generateDocumentFromEntitySchema,
  type GenerateDocumentFromEntityInput,
} from "@/modules/documents/schemas/document-schema";
import { generateDocumentFromEntityAction } from "@/modules/documents/actions/document-actions";

const GENERATABLE_TYPES = ["quote", "rental_agreement", "invoice"] as const;

export function GenerateDocumentDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof generateDocumentFromEntitySchema>, unknown, GenerateDocumentFromEntityInput>({
    resolver: zodResolver(generateDocumentFromEntitySchema),
    defaultValues: { entityType: "quote" },
  });

  async function onSubmit(values: GenerateDocumentFromEntityInput) {
    const result = await generateDocumentFromEntityAction(values);
    if (result.success) {
      toast.success("Document generated");
      setOpen(false);
      form.reset({ entityType: "quote" });
      router.push(`/documents/${result.data.id}`);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText />
          Generate PDF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate a PDF</DialogTitle>
          <DialogDescription>Builds a simple PDF from a quote, rental agreement, or invoice.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="entityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENERATABLE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
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
              name="entityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Record ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="UUID" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
