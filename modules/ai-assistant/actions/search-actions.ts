"use server";

import { hasPermission } from "@/lib/auth/permissions";
import { searchRepository, type SearchResult } from "@/modules/ai-assistant/repositories/search-repository";

// No mutation, no domain error type -- same "skip the write-module boilerplate" call made for
// Reports' repositories. Uses hasPermission (not requirePermission) since this runs as a
// client-invoked Server Action, not a page load -- requirePermission's redirect() is meant for
// page/layout components and would surface as an awkward NEXT_REDIRECT error here instead of a
// clean denial the search box can just ignore.
export async function searchAction(query: string): Promise<SearchResult[]> {
  const allowed = await hasPermission("ai_assistant.view");
  if (!allowed) throw new Error("You don't have permission to search.");
  return searchRepository.search(query);
}
