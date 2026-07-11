"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { searchAction } from "@/modules/ai-assistant/actions/search-actions";
import type { SearchResult } from "@/modules/ai-assistant/repositories/search-repository";

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  equipment_item: "Equipment",
  customer: "Customer",
  event: "Event",
  invoice: "Invoice",
  rental_agreement: "Rental agreement",
  quote: "Quote",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      searchAction(query)
        .then((data) => {
          setResults(data);
          setSearched(true);
        })
        .catch(() => {
          setResults([]);
          setSearched(true);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search asset tags, serials, customers, events, invoices, agreements, quotes..."
          className="pl-9"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />}
      </div>

      {searched && results.length === 0 && (
        <p className="text-muted-foreground text-sm">No matches for &ldquo;{query}&rdquo;.</p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((result) => (
            <Link key={`${result.type}-${result.id}`} href={result.href}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{result.title}</p>
                    {result.subtitle && <p className="text-muted-foreground text-xs capitalize">{result.subtitle}</p>}
                  </div>
                  <Badge variant="outline">{TYPE_LABELS[result.type]}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
