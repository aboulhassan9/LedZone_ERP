import { requirePermission } from "@/lib/auth/permissions";
import { GlobalSearch } from "@/modules/ai-assistant/components/global-search";

export default async function SearchPage() {
  await requirePermission("ai_assistant.view");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-muted-foreground text-sm">
          Look up equipment, customers, events, invoices, rental agreements, and quotes across
          every module.
        </p>
      </div>
      <GlobalSearch />
    </div>
  );
}
