"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, MapPin, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { LocationFormDialog } from "@/modules/warehouse/components/locations/location-form-dialog";
import { getLocationContentsAction } from "@/modules/warehouse/actions/warehouse-location-actions";
import type { WarehouseLocationRow } from "@/modules/warehouse/repositories/warehouse-location-repository";

type OccupancyMap = Record<
  string,
  { capacity_units: number | null; occupied_units: number; utilization_pct: number | null }
>;

type TreeNode = WarehouseLocationRow & { children: TreeNode[] };

function buildTree(rows: WarehouseLocationRow[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  matches,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (node: TreeNode) => void;
  matches: (node: TreeNode) => boolean;
}) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const visible = matches(node) || node.children.some((c) => subtreeMatches(c, matches));

  if (!visible) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onSelect(node);
          if (hasChildren) setOpen((o) => !o);
        }}
        className={cn(
          "hover:bg-accent flex w-full items-center gap-1.5 rounded-md py-1.5 text-left text-sm",
          selectedId === node.id && "bg-accent"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="truncate">{node.name || node.code}</span>
        <span className="text-muted-foreground shrink-0 font-mono text-xs">{node.full_code}</span>
        {node.status === "inactive" && (
          <Badge variant="outline" className="ml-auto shrink-0 text-xs">
            Inactive
          </Badge>
        )}
      </button>
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              matches={matches}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function subtreeMatches(node: TreeNode, matches: (node: TreeNode) => boolean): boolean {
  return matches(node) || node.children.some((c) => subtreeMatches(c, matches));
}

function LocationDetailsPanel({ node, occupancy }: { node: TreeNode; occupancy?: OccupancyMap[string] }) {
  const { data, isLoading } = useQuery({
    queryKey: ["warehouse-location-contents", node.id],
    queryFn: () => getLocationContentsAction(node.id),
    enabled: node.is_placeable,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4" />
          {node.name || node.full_code}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-muted-foreground">Full code</dt>
            <dd className="font-mono font-medium">{node.full_code}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium capitalize">{node.node_type.replace(/_/g, " ")}</dd>
          </div>
          {node.location_category && (
            <div>
              <dt className="text-muted-foreground">Category</dt>
              <dd className="font-medium capitalize">{node.location_category.replace(/_/g, " ")}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Addressable</dt>
            <dd className="font-medium">{node.is_placeable ? "Yes (bin/staging)" : "No (container)"}</dd>
          </div>
        </dl>

        {node.is_placeable && (
          <div className="grid gap-1.5">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Capacity</span>
              <span>
                {occupancy?.occupied_units ?? 0}
                {occupancy?.capacity_units != null ? ` / ${occupancy.capacity_units}` : " (unlimited)"}
              </span>
            </div>
            {occupancy?.capacity_units != null && (
              <Progress value={occupancy.utilization_pct ?? 0} />
            )}
          </div>
        )}

        {node.is_placeable && (
          <div className="grid gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Package className="size-3.5" /> Contents
            </p>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <>
                {(data?.items.length ?? 0) === 0 && (data?.consumables.length ?? 0) === 0 ? (
                  <p className="text-muted-foreground text-sm">Empty.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {data?.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between">
                        <span className="font-mono">{item.asset_tag}</span>
                        <Badge variant="outline">{item.current_status}</Badge>
                      </li>
                    ))}
                    {data?.consumables.map((c) => (
                      <li key={c.model_id} className="flex items-center justify-between">
                        <span>{c.model_name}</span>
                        <span className="text-muted-foreground">
                          {c.quantity_on_hand} {c.unit_of_measure}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LocationTree({
  warehouseId,
  locations,
  occupancy,
}: {
  warehouseId: string;
  locations: WarehouseLocationRow[];
  occupancy: OccupancyMap;
}) {
  const { hasPermission } = useAuth();
  const canManage =
    hasPermission("warehouse.manage") ||
    hasPermission("warehouse.location.manage") ||
    hasPermission("warehouse.bin.manage");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TreeNode | null>(null);

  const tree = useMemo(() => buildTree(locations), [locations]);

  const matches = (node: TreeNode) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      node.full_code?.toLowerCase().includes(q) ||
      node.name?.toLowerCase().includes(q) ||
      node.code.toLowerCase().includes(q) ||
      false
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <Input
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          {canManage && (
            <LocationFormDialog
              warehouseId={warehouseId}
              locations={locations}
              defaultParentId={selected?.id}
            />
          )}
        </CardHeader>
        <CardContent>
          {tree.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No locations yet. Create a top-level zone to get started.
            </p>
          ) : (
            <div className="flex flex-col">
              {tree.map((root) => (
                <TreeRow
                  key={root.id}
                  node={root}
                  depth={0}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                  matches={matches}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected ? (
        <LocationDetailsPanel node={selected} occupancy={occupancy[selected.id]} />
      ) : (
        <Card>
          <CardContent className="text-muted-foreground pt-6 text-center text-sm">
            Select a location to see its details.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
