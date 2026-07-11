# Documents Module

Document generation, storage, and a lightweight internal signature-tracking workflow — Module
11 — built on the existing `lib/storage` (a new `documents` bucket, migration 0077) and
`lib/services/pdf-generator`'s `generateSimplePdf`.

**Not a legally-binding e-signature platform**: no cryptographic signing, no external
notary/audit-trail service. `document_signatures` is an internal record of "who typed their
name, when" — proportionate to an internal ERP's needs, the same scope-discipline applied
throughout this codebase (e.g. Finance deliberately not being a double-entry ledger).

`documents.entity_type`/`entity_id` is a deliberate polymorphic reference (no FK) — a document
can attach to a quote, rental agreement, invoice, event, or customer, and a real FK can't span
multiple target tables.

Two ways to get a document in:
- **Upload**: the file goes straight from the browser to Supabase Storage
  (`modules/documents/lib/upload-client.ts`), same pattern
  `modules/settings/components/file-manager.tsx` already uses for personal uploads — the Server
  Action only records metadata for a path that already exists, storage RLS having already
  checked `documents.manage` on the upload itself.
- **Generate**: `generateDocumentFromEntity` reads a quote/rental agreement/invoice (read-only
  cross-module reads into CRM/Rental/Finance's repositories — Documents is a downstream,
  aggregating module, not a peer needing strict isolation), builds a PDF server-side via
  `generateSimplePdf`, and uploads it.

`documents.status` is `draft -> pending_signature -> signed -> archived` — `signed` is reached
automatically the moment the first signature is recorded, same lightweight-status-map pattern
used throughout this codebase.

Database + RLS: `supabase/migrations/0077-0078`. Service layer: `schemas/ -> repositories/ ->
services/ -> actions/`, own copy of `shared/{authorize,audit,run-action}.ts`.

UI: `app/(dashboard)/documents/*`.
