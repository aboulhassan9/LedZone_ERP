import "server-only";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";

// Generic QR code generation, reusable by any future module (Inventory equipment tags,
// event check-in links, etc.) — not tied to a specific entity type.

export async function generateQrCodePng(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, { type: "png", margin: 1, width: 512 });
}

// Generates and stores a QR code for `data` under `path` in the qr-codes bucket
// (e.g. path = "equipment/<uuid>.png"), returning its public URL.
export async function generateAndStoreQrCode(data: string, path: string): Promise<string> {
  const png = await generateQrCodePng(data);
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from(STORAGE_BUCKETS.qrCodes)
    .upload(path, png, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Failed to store QR code: ${error.message}`);

  return admin.storage.from(STORAGE_BUCKETS.qrCodes).getPublicUrl(path).data.publicUrl;
}
