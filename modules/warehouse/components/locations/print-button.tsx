"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// canPrint is resolved server-side (warehouse.manage or warehouse.labels — the permission
// key seeded specifically for "print location QR/barcode labels") and passed in, rather than
// checked client-side, since this component renders on a page with no AuthProvider context.
export function PrintButton({ canPrint }: { canPrint: boolean }) {
  if (!canPrint) return null;
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer /> Print
    </Button>
  );
}
