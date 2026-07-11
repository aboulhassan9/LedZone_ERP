"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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
import {
  uploadWarehouseDocumentMetaSchema,
  DOCUMENT_TYPES,
  type UploadWarehouseDocumentMetaInput,
} from "@/modules/warehouse/schemas/warehouse-document-schema";
import { uploadWarehouseDocumentAction } from "@/modules/warehouse/actions/warehouse-document-actions";

export function DocumentUploadDialog({
  relatedEntityType,
  relatedEntityId,
}: {
  relatedEntityType: "transfer" | "receiving" | "dispatch" | "cycle_count" | "warehouse_location";
  relatedEntityId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const form = useForm<UploadWarehouseDocumentMetaInput>({
    resolver: zodResolver(uploadWarehouseDocumentMetaSchema),
    defaultValues: { relatedEntityType, relatedEntityId, documentType: "photo" },
  });

  async function onSubmit(values: UploadWarehouseDocumentMetaInput) {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    setIsSubmitting(true);
    const result = await uploadWarehouseDocumentAction(values, file);
    setIsSubmitting(false);
    if (result.success) {
      toast.success("Document uploaded");
      setOpen(false);
      form.reset({ relatedEntityType, relatedEntityId, documentType: "photo" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload />
          Upload document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>Photos, inspection forms, packing lists, delivery notes, signatures.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((t) => (
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
            <div className="grid gap-2">
              <FormLabel>File</FormLabel>
              <Input ref={fileInputRef} type="file" required />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
