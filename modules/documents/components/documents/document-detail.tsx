"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Download, Send, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentStatusBadge } from "@/modules/documents/components/status-badge";
import { AddSignatureDialog } from "@/modules/documents/components/documents/add-signature-dialog";
import { useAuth } from "@/providers/auth-provider";
import { setDocumentStatusAction } from "@/modules/documents/actions/document-actions";
import type { DocumentRow } from "@/modules/documents/repositories/document-repository";
import type { DocumentSignatureRow } from "@/modules/documents/repositories/signature-repository";

export function DocumentDetail({
  document,
  downloadUrl,
  signatures,
}: {
  document: DocumentRow;
  downloadUrl: string;
  signatures: DocumentSignatureRow[];
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = hasPermission("documents.manage");

  function afterMutation() {
    queryClient.invalidateQueries({ queryKey: ["document", document.id] });
    router.refresh();
  }

  const setStatusMutation = useMutation({
    mutationFn: (status: "pending_signature" | "archived") => setDocumentStatusAction(document.id, { status }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Document status updated");
        afterMutation();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {document.name}
            <DocumentStatusBadge status={document.status} />
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                <Download /> Download
              </a>
            </Button>
            {canManage && document.status === "draft" && (
              <Button size="sm" disabled={setStatusMutation.isPending} onClick={() => setStatusMutation.mutate("pending_signature")}>
                <Send /> Send for signature
              </Button>
            )}
            {canManage && document.status === "pending_signature" && <AddSignatureDialog documentId={document.id} />}
            {canManage && document.status !== "archived" && (
              <Button
                size="sm"
                variant="outline"
                disabled={setStatusMutation.isPending}
                onClick={() => setStatusMutation.mutate("archived")}
              >
                <Archive /> Archive
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium capitalize">{document.document_type.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Attached to</dt>
              <dd className="font-medium capitalize">{document.entity_type?.replace(/_/g, " ") ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">File size</dt>
              <dd className="font-medium">
                {document.file_size != null ? `${Math.round(document.file_size / 1024)} KB` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">{new Date(document.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
          {document.notes && <p className="text-muted-foreground mt-4 text-sm">{document.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signatures</CardTitle>
        </CardHeader>
        <CardContent>
          {signatures.length === 0 ? (
            <p className="text-muted-foreground text-sm">No signatures recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Signed at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signatures.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.signer_name}</TableCell>
                    <TableCell>{s.signer_email ?? "—"}</TableCell>
                    <TableCell>{new Date(s.signed_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
