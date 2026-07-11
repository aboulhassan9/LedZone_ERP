import { createClient } from "@/lib/supabase/server";
import { warehouseDocumentService } from "@/modules/warehouse/services/warehouse-document-service";
import { DocumentUploadDialog } from "@/modules/warehouse/components/documents/document-upload-dialog";
import { DocumentListClient } from "@/modules/warehouse/components/documents/document-list-client";

// Server Component: signed-URL generation must happen server-side (private bucket), same
// pattern as the Inventory item detail page's attachments tab.
export async function DocumentList({
  relatedEntityType,
  relatedEntityId,
  canUpload,
}: {
  relatedEntityType: "transfer" | "receiving" | "dispatch" | "cycle_count" | "warehouse_location";
  relatedEntityId: string;
  canUpload: boolean;
}) {
  const documents = await warehouseDocumentService.listDocumentsFor(relatedEntityType, relatedEntityId);

  const supabase = await createClient();
  const withUrls = await Promise.all(
    documents.map(async (doc) => {
      const { data } = await supabase.storage.from("warehouse-docs").createSignedUrl(doc.storage_path, 300);
      return { ...doc, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="flex flex-col gap-3">
      {canUpload && (
        <div>
          <DocumentUploadDialog relatedEntityType={relatedEntityType} relatedEntityId={relatedEntityId} />
        </div>
      )}
      <DocumentListClient
        documents={withUrls}
        relatedEntityType={relatedEntityType}
        canManage={canUpload}
      />
    </div>
  );
}
