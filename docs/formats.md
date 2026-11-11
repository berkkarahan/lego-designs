# Data contracts (schema version 1)

All paths below are relative to the repository root. CLI commands require Node.js >=20. JSON uses positive integer piece counts or null for unknown stock; design requirements must have positive integer counts.

## Canonical inventory
inventory/parts.json contains:
- schema_version: 1
- sources: unique {id, label, kind, path?, url?, sha256?, notes?}. kind is image, pdf, product or user. Local paths stay inside the repo; optional SHA-256 is verified.
- parts: unique {id, name, category, identity_status, notes, lots}. identity_status is identified (descriptive identity established), inferred (candidate identity) or unknown. It never means mechanically tested.
- lots: {import_id, quantity, quantity_basis, source_id, location, notes}. quantity is the total acquired, already multiplied by copies. quantity_basis is printed, visual_estimate, user_confirmed, measured or unknown; unknown requires quantity:null.
- imports: canonical receipts {id, manifest_hash, copies, created_at, source_ids, notes, changes:[{part_id,quantity}]}.

IDs use lowercase letters/digits separated by hyphens. Receipts and lots must agree. Query totals are computed from lots; no second editable total exists.

## Import manifest
inventory/imports/<id>.json:
```json
{
  "schema_version": 1,
  "id": "purchase-example",
  "copies": 1,
  "sources": [
    {
      "id": "example-evidence",
      "label": "User counted pins",
      "kind": "user",
      "notes": "Example only"
    }
  ],
  "notes": "Example shape; not owned stock.",
  "items": [
    {
      "part_id": "example-pin",
      "part": {
        "name": "Example measured pin",
        "category": "pins",
        "identity_status": "identified",
        "notes": "A new descriptive part"
      },
      "quantity": 4,
      "quantity_basis": "user_confirmed",
      "source_id": "example-evidence",
      "location": "User message: four pins"
    }
  ]
}
```

Use part metadata only for new IDs; existing IDs use part_id alone. Quantities are per kit and copies multiplies them. Merge evidence about the same unit before importing. A different import ID denotes another acquisition, not another photo.

## Design parts list
parts.json contains schema_version, name, status, notes, requirements.
Each requirement has code, description, quantity, part_id, match_status, notes, and optional candidates.
- exact: the requirement refers to the established descriptive stock identity.
- tentative: a candidate stock ID may match a more specific requirement.
- unresolved: part_id is null; candidates may list known stock IDs that need inspection.
Codes are unique. Repeated stock IDs across different codes are aggregated before comparison.

## Stock results and exit codes
check emits design, status, rows, stock_reserved:false. Each row includes codes, required, owned_known, has_unknown_quantity, missing, status, notes and candidate IDs.
- covered_by_recorded_stock: established identity/mapping with enough non-estimated stock.
- shortage: established identity/mapping and a known count below requirements, with no unknown/estimated remainder.
- needs_verification: tentative identity/mapping, unresolved requirement, visual estimate or unknown remaining stock.
Known sufficient reliable lots can cover a requirement even if additional lots have unknown counts. Candidate mappings cannot establish either coverage or a definite shortage.
CLI exit codes: 0 success/covered, 1 shortage, 2 invalid input/I/O error, 3 needs verification. Overall check status prioritizes shortage but preserves every unresolved row. --json returns JSON; errors go to stderr.

## Guide source
guide.json contains title, subtitle, status, introduction, verification_notes, and steps.
Each step: title, instruction, check, parts:[{code,quantity}], diagram (relative JSON path).
The sum of added parts across steps must exactly equal parts.json requirements. Reused/adjusted pieces are described in instructions, not added again.
Diagram JSON: width, height (points), primitives. Supported primitives: rect {x,y,width,height,fill,stroke}, line {x1,y1,x2,y2,stroke,width,arrow?}, circle {cx,cy,r,fill,stroke}, text {x,y,text,size,fill}. Diagram coordinates start at top-left. Text is baseline-positioned.
Keep diagrams within a 480 x 280 point area; renderer rejects out-of-bounds shapes/labels. Use SVGs as matching editable exports, never as proof of CAD fit.
