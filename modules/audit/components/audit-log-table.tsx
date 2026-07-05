import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type AuditLogRow = {
  id: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
};

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-muted-foreground text-center">
              No activity yet.
            </TableCell>
          </TableRow>
        )}
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
            </TableCell>
            <TableCell>{row.actorName ?? "System"}</TableCell>
            <TableCell>
              <Badge variant="secondary">{row.action}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.entityType}
              {row.entityId ? ` #${row.entityId.slice(0, 8)}` : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
