import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConflictSeverityBadge } from "@/modules/planning/components/status-badge";
import type { EquipmentConflictRow, EquipmentShortageRow } from "@/modules/planning/repositories/equipment-conflict-repository";
import type { EquipmentPlanItemRow } from "@/modules/planning/repositories/equipment-plan-repository";

export function ConflictPanel({
  conflicts,
  shortages,
  items,
  modelNames,
}: {
  conflicts: EquipmentConflictRow[];
  shortages: EquipmentShortageRow[];
  items: EquipmentPlanItemRow[];
  modelNames: Record<string, string>;
}) {
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved_at);
  const unresolvedShortages = shortages.filter((s) => !s.resolved_at);
  const itemModelName = Object.fromEntries(
    items.map((i) => [i.id, modelNames[i.model_id] ?? i.model_id])
  );

  if (unresolvedConflicts.length === 0 && unresolvedShortages.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          Conflicts &amp; shortages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {unresolvedConflicts.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{c.description}</p>
              <p className="text-muted-foreground text-xs">{c.conflict_type.replace(/_/g, " ")}</p>
            </div>
            <ConflictSeverityBadge severity={c.severity} />
          </div>
        ))}
        {unresolvedShortages.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">
                Short {s.quantity_short} of {itemModelName[s.plan_item_id] ?? "a requested item"}
              </p>
              <p className="text-muted-foreground text-xs">quantity shortage</p>
            </div>
            <ConflictSeverityBadge severity="blocking" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
