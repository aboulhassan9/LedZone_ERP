import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AddSignatureInput } from "@/modules/documents/schemas/signature-schema";

export type DocumentSignatureRow = {
  id: string;
  document_id: string;
  signer_name: string;
  signer_email: string | null;
  signed_at: string;
  notes: string | null;
};

const SIGNATURE_COLUMNS = "id, document_id, signer_name, signer_email, signed_at, notes";

export const signatureRepository = {
  async findByDocument(documentId: string): Promise<DocumentSignatureRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_signatures")
      .select(SIGNATURE_COLUMNS)
      .eq("document_id", documentId)
      .order("signed_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    documentId: string,
    input: AddSignatureInput,
    userId: string
  ): Promise<DocumentSignatureRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_signatures")
      .insert({
        document_id: documentId,
        signer_name: input.signerName,
        signer_email: input.signerEmail ?? null,
        notes: input.notes ?? null,
        created_by: userId,
      })
      .select(SIGNATURE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
