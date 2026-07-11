import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  draft: "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400",
  pending_signature: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  signed: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  archived: "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400",
};

function humanize(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function DocumentStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(DOCUMENT_STATUS_STYLES[status] ?? "", className)}>
      {humanize(status)}
    </Badge>
  );
}
