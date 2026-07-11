# AI Assistant Module

Module 13 — deliberately scoped down from its original "in-app assistant (equipment lookup,
report summarization, natural-language queries across modules)" note.

**No LLM provider is configured in this environment** — no `ANTHROPIC_API_KEY`/
`OPENAI_API_KEY`-equivalent in `.env`/`.env.local`, no AI SDK dependency in `package.json`.
Report summarization and free-text natural-language interpretation genuinely require a model
call; faking that with a canned-response chat box would be fabricated functionality, the same
discipline applied throughout this codebase (Documents' signature tracking is an internal
record, not a faked DocuSign integration; Finance is deliberately not a double-entry ledger).

What ships instead is the one piece of the original scope that's real without an LLM:
**structured cross-module search** — "equipment lookup... queries across modules" — covering
equipment items (asset tag / serial number), customers, events, invoices, rental agreements, and
quotes. `repositories/search-repository.ts` runs targeted `ilike` queries per table (no
full-text index exists yet on any of them) and returns a flat, typed result list with a link to
each record's own detail page.

Gated by a single `ai_assistant.view` permission (migration 0080), same single-gate pattern
Reports used for `reports.view`.

**To add real natural-language/summarization capability later**: configure an LLM provider key,
add the corresponding SDK dependency, and build a new service on top of the search results this
module already returns — the plumbing (permission gate, cross-module read access) is in place.

UI: `app/(dashboard)/search/page.tsx`.
