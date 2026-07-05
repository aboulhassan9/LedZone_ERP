export const STORAGE_BUCKETS = {
  logos: "logos",
  uploads: "uploads",
  qrCodes: "qr-codes",
  barcodes: "barcodes",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
