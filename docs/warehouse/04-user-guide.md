# Warehouse Module — User Guide

## Getting around

The **Warehouse** section in the sidebar (visible if you hold `warehouse.view`) has:
Dashboard, Scan, Warehouses, Location Explorer, Transfers, Receiving, Dispatch, Picking,
Reservations, Cycle Counts, Bulk Move.

## Dashboard

KPI cards (total warehouses, active locations, equipment available/reserved/in-transit,
pending transfers/receiving/dispatch) and a cycle-count-progress panel. Each card links to
its full list.

## Warehouses

Create/edit a warehouse (name, code, type, address, GPS, manager, capacity). One warehouse
can be marked "default" — used to pre-select the Location Explorer. A warehouse's detail
page shows an occupancy summary (bins used/empty, total equipment/consumables) and links to
its Location Explorer.

## Location Explorer

A tree view of a warehouse's Zone → Row → Rack → Shelf → Bin hierarchy (plus staging/
loading/repair/quarantine/dock/charging areas as top-level siblings of Zone). Search
filters by code or name; a matching bin auto-expands its ancestor chain even if they're
collapsed. Selecting a placeable location (a bin or special area) shows its capacity,
current contents (items + consumable quantities), and — if it has one — its QR code /
barcode with Generate/Regenerate buttons and a Print label link.

**Print labels**: the "Print labels" button opens a batch sheet of every labeled bin in the
current warehouse (opens in a new tab, use your browser's print/PDF dialog). A single
location's own label page is linked from its details panel.

## Transfers

Create a transfer (from/to warehouse, optional from/to bin, line items) — it starts as a
**draft**. From the transfer's detail page: **Submit** (draft → submitted, sends it for
approval), **Approve**/**Reject** (a manager action), **Cancel** (available until it's
completed/cancelled/rejected/failed), **Execute** (moves every pending line's item/quantity
— only available once approved).

## Receiving

Create a receiving record (warehouse, source — supplier/purchase order/customer return/
repair/internal transfer/manual — and lines with a destination bin and condition-on-arrival).
On the detail page, **Place** each line once its destination is set; the record
auto-completes once every line is placed.

## Dispatch

Create a dispatch record (warehouse, destination type/reference, lines — consumable lines
need a source bin). **Dispatch** each line on the detail page; it auto-completes once every
line is dispatched. Attach photos/signatures under Documents.

## Picking

Create a pick list (warehouse, method, optional assignee, lines) — every item line gets a
24-hour reservation automatically. **Start picking** to begin. On the detail page, either
use the manual per-line "Stage to" + Pick button, or the **Scan to pick** bar: scan the
item, then scan the staging bin (this also completes the pick) — or scan the item alone and
use the Pick button if there's no staging location.

## Reservations

Hold a specific item or a bin so nothing else claims it. Shows an equipment-availability
breakdown by status and every reservation with its expiry; **Release** ends one early.

## Cycle Counts

Create a count (warehouse, scope, lines with expected quantities). **Start** it, then record
each line's counted quantity — variance is computed automatically. **Submit for approval**
once every line is counted, then a manager **Approves** it, which applies consumable
adjustments and files a lost report for any individually-tracked item that's missing.

## Scan

A single scan box: scan any location's label or an item's QR/barcode/asset-tag and jump
straight to it. Works with a handheld/Bluetooth barcode scanner (it types the code and
presses Enter for you) or by typing the code and pressing Enter / clicking Go.

## Bulk Move

Scan several items, then scan one destination bin, then confirm — moves them all in one
action. Useful for reorganizing a shelf or consolidating stock.

## Everywhere: scan-to-fill

Any line-item picker (transfer/receiving/dispatch/cycle-count creation, and the from/to bin
fields on a transfer) has a scan box above it — scanning an item/consumable/location fills
the relevant field instead of using the dropdown.
