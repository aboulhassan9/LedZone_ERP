import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DocumentTable } from "@/modules/documents/components/documents/document-table";
import { DocumentUploadDialog } from "@/modules/documents/components/documents/document-upload-dialog";
import { GenerateDocumentDialog } from "@/modules/documents/components/documents/generate-document-dialog";
import type { DocumentRow } from "@/modules/documents/repositories/document-repository";

export default async function DocumentsPage() {
  await requirePermission("documents.view");

  const supabase = await createClient();
  const [{ data: documents }, canManage] = await Promise.all([
    supabase
      .from("documents")
      .select("id, name, document_type, entity_type, entity_id, file_path, file_size, mime_type, status, notes, created_at, updated_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    hasPermission("documents.manage"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-muted-foreground text-sm">Generated PDFs, uploaded files, and internal signature tracking.</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <GenerateDocumentDialog />
            <DocumentUploadDialog />
          </div>
        )}
      </div>
      <DocumentTable documents={(documents ?? []) as DocumentRow[]} />
    </div>
  );
}
