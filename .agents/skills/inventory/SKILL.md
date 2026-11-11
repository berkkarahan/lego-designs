---
name: inventory
description: "Query this repository's LEGO-compatible stock and reason about kit components from screenshots or product links. Use when /inventory is invoked, when asking what parts are owned, or when importing explicitly owned parts. Product inspection alone does not add stock."
---

# Inventory

Work relative to the repository root containing inventory/parts.json, not this skill directory. Read [component reasoning](references/components.md) when interpreting images/products and [imports](references/imports.md) before changing stock. Consult ../../../.. /docs/formats.md via the actual root path docs/formats.md for the JSON contract.

## Choose the operation from intent

- Bare /inventory: run node tools/inventory.mjs list --json, then summarize by category with unresolved stock details. Never modify stock.
- A question: inspect the inventory and filter through list <query> --json. Reason across categories when useful; a literal search for "tank" is not a compatibility analysis. Cite local part IDs and distinguish counted, estimated and unknown quantities.
- A supplied screenshot/link without explicit ownership or "add": inspect components and compare against stock. No import, acquisition or receipt.
- "Add", "I own", or "I bought": analyze evidence and import one complete kit unless another quantity was specified. State this assumption in the result. Do not ask for routine reconfirmation.

Think independently. Identify functional groups and likely mechanisms, combine multiple views, reconcile evidence, and offer useful conclusions. Ask one focused question only if an unresolved purchased variant, copy count or acquisition identity would corrupt stock. Nonblocking unknowns belong in the record.

## Honest stock conclusions

Printed counts from a user-confirmed kit are recorded quantities, not a physical inspection. Visual estimates remain estimates. Unknown dimensions or identity remain unresolved even when the quantity is clear. A photo-derived standard equivalent does not establish genuine LEGO branding, tolerances, electrical behavior or compatibility.

Use the CLI for arithmetic, manifest validation and writes. Preserve original evidence and references. Report what changed, assumptions and verification needs; for inspection, explain the component breakdown without claiming an addition.

For design requests, use the sibling design skill and pass the relevant stock findings. Do not turn an inventory query into unsolicited model generation.
