"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText, Download, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveWarehouseDocumentAction } from "@/modules/warehouse/actions/warehouse-document-actions";
import type { WarehouseDocumentRow } from "@/modules/warehouse/repositories/warehouse-document-repository";

type DocumentWithUrl = WarehouseDocumentRow & { url: string | null };

export function DocumentListClient({
  documents,
  relatedEntityType,
  canManage,
}: {
  documents: DocumentWithUrl[];
  relatedEntityType: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleArchive(id: string, relatedEntityId: string) {
    startTransition(async () => {
      const result = await archiveWarehouseDocumentAction(id, relatedEntityType, relatedEntityId);
      if (result.success) {
        toast.success("Document removed");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  if (documents.length === 0) {
    return <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
          <div className="flex items-center gap-2">
            {doc.mime_type?.startsWith("image/") ? (
              <ImageIcon className="text-muted-foreground size-4" />
            ) : (
              <FileText className="text-muted-foreground size-4" />
            )}
            <div>
              <p className="font-medium">{doc.file_name}</p>
              <p className="text-muted-foreground text-xs capitalize">{doc.document_type.replace(/_/g, " ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {doc.url && (
              <Button variant="ghost" size="icon" className="size-8" asChild>
                <a href={doc.url} target="_blank" rel="noreferrer" download={doc.file_name}>
                  <Download className="size-4" />
                </a>
              </Button>
            )}
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={isPending}
                onClick={() => handleArchive(doc.id, doc.related_entity_id)}
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
