import "server-only";
import bwipjs from "bwip-js/node";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";

// Code128 barcodes — generic, reusable by any future module that needs to tag a physical
// item (Inventory equipment units, warehouse bins, etc.).

export async function generateBarcodePng(code: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: "code128",
    text: code,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
  });
}

export async function generateAndStoreBarcode(code: string, path: string): Promise<string> {
  const png = await generateBarcodePng(code);
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from(STORAGE_BUCKETS.barcodes)
    .upload(path, png, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Failed to store barcode: ${error.message}`);

  return admin.storage.from(STORAGE_BUCKETS.barcodes).getPublicUrl(path).data.publicUrl;
}
