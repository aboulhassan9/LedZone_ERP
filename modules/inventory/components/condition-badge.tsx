import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const CONDITION_STYLES: Record<string, string> = {
  new: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  good: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  fair: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  poor: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-400",
  damaged: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

export function ConditionBadge({ condition, className }: { condition: string; className?: string }) {
  const style = CONDITION_STYLES[condition] ?? "";
  return (
    <Badge variant="outline" className={cn(style, className)}>
      {condition.charAt(0).toUpperCase() + condition.slice(1)}
    </Badge>
  );
}
