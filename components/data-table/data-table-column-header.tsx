"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp className="ml-2 size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-2 size-3.5" />
      ) : (
        <ChevronsUpDown className="ml-2 size-3.5 opacity-50" />
      )}
    </Button>
  );
}
