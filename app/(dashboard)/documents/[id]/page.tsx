import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import { DocumentDetail } from "@/modules/documents/components/documents/document-detail";
import type { DocumentRow } from "@/modules/documents/repositories/document-repository";
import type { DocumentSignatureRow } from "@/modules/documents/repositories/signature-repository";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("documents.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("id, name, document_type, entity_type, entity_id, file_path, file_size, mime_type, status, notes, created_at, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!document) notFound();
  const documentRow = document as DocumentRow;

  const [{ data: signatures }, { data: signedUrlData }] = await Promise.all([
    supabase
      .from("document_signatures")
      .select("id, document_id, signer_name, signer_email, signed_at, notes")
      .eq("document_id", id)
      .order("signed_at", { ascending: false }),
    supabase.storage.from(STORAGE_BUCKETS.documents).createSignedUrl(documentRow.file_path, 300),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Document</h1>
        <p className="text-muted-foreground text-sm">Draft → Pending signature → Signed → Archived.</p>
      </div>
      <DocumentDetail
        document={documentRow}
        downloadUrl={signedUrlData?.signedUrl ?? "#"}
        signatures={(signatures ?? []) as DocumentSignatureRow[]}
      />
    </div>
  );
}
