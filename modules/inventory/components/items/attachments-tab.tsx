"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { ImageGallery, type GalleryImage } from "@/modules/inventory/components/image-gallery";
import { AttachmentUploadDialog } from "@/modules/inventory/components/items/attachment-upload-dialog";
import { archiveAttachmentAction } from "@/modules/inventory/actions/attachment-actions";
import type { EquipmentItemAttachmentRow } from "@/modules/inventory/repositories/attachment-repository";

export type AttachmentWithUrl = EquipmentItemAttachmentRow & { url: string | null };

export function AttachmentsTab({
  itemId,
  attachments,
}: {
  itemId: string;
  attachments: AttachmentWithUrl[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const images: GalleryImage[] = attachments
    .filter((a) => a.attachment_type === "image" && a.url)
    .map((a) => ({ url: a.url as string, fileName: a.file_name, description: a.description }));

  const documents = attachments.filter((a) => a.attachment_type !== "image");

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveAttachmentAction(id, itemId);
      if (result.success) {
        toast.success("Attachment removed");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Images</CardTitle>
          {canManage && <AttachmentUploadDialog itemId={itemId} />}
        </CardHeader>
        <CardContent>
          <ImageGallery images={images} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No documents attached.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="text-muted-foreground size-4" />
                    <div>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                          {doc.file_name}
                        </a>
                      ) : (
                        <span className="font-medium">{doc.file_name}</span>
                      )}
                      <p className="text-muted-foreground text-xs capitalize">
                        {doc.attachment_type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={isPending}
                      onClick={() => handleArchive(doc.id)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
