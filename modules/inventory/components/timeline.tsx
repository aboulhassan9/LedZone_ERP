import { cn } from "@/lib/utils";

export type TimelineEntry = {
  id: string;
  title: string;
  description?: string | null;
  timestamp: string;
  icon?: React.ReactNode;
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed py-10 text-center text-sm">
        No activity yet.
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-0">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
          {index !== entries.length - 1 && (
            <span className="bg-border absolute top-6 left-[11px] h-full w-px" aria-hidden />
          )}
          <span
            className={cn(
              "bg-muted text-muted-foreground z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs"
            )}
          >
            {entry.icon ?? "•"}
          </span>
          <div className="flex flex-col gap-0.5 pt-0.5">
            <p className="text-sm font-medium">{entry.title}</p>
            {entry.description && (
              <p className="text-muted-foreground text-sm">{entry.description}</p>
            )}
            <p className="text-muted-foreground text-xs">
              {new Date(entry.timestamp).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
