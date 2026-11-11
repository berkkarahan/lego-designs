# Importing explicitly owned parts

Read root docs/formats.md and inventory/README.md.

1. Query existing stock and prior receipts. Decide whether the evidence describes a new acquisition or adds information about existing stock.
2. Copy source screenshots into inventory/sources/ under descriptive, collision-free filenames. Preserve original bytes. Record SHA-256. For links, record the exact URL, selected variant and retrieval date in source notes; preserve supplied or available product evidence locally when possible. Never claim a snapshot exists if it could not be obtained.
3. Create inventory/imports/<acquisition-id>.json. Use schema_version 1, unique acquisition id, copies (default 1), sources, notes, items. Quantities in items are per copy.
4. Existing part: use part_id without part metadata. New part: provide part_id and part metadata. Use quantity null and quantity_basis unknown for unreadable/unspecified counts; visual counting uses visual_estimate.
5. Run node tools/inventory.mjs import <manifest> --dry-run --json, inspect its receipt, and run without --dry-run. Run validate afterward.
6. Summarize additions, copy assumption, source evidence, unresolved details, and duplicate/no-op results.

The canonical receipt is embedded in inventory/parts.json; the saved manifest is its reproducible input. The importer commits receipts and stock together and refuses concurrent imports. Do not remove a lock until you establish no import is running.

Reapplying the same ID and contents is a no-op. Changing a committed manifest under the same ID is rejected. A separate purchase needs a separate ID. Never bypass these checks with direct edits.

Evidence-only updates and physical-count corrections are distinct from acquisitions. For those, prepare a reconciliation: preserve the original input, document the correction with source evidence, and use a reviewed explicit edit of the relevant source/part/lot plus receipt change together, followed by validate and stock checks. Do not invent a negative acquisition or append the verified count as extra stock. Ask for clarification only when the correction's target or meaning is ambiguous.
