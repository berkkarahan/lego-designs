# From concept to illustrated guide

Use templates/design as a structure; do not copy its illustrative requirements as actual stock claims. Read docs/formats.md.

Develop:
- Purpose, silhouette, scale and play behavior.
- Mechanisms and structural supports; for motorized models, torque/speed assumptions, power and independent control needs.
- Specific connection locations, orientations, axle lengths, clearances and subassembly order. If a required dimension cannot be established, mark it unresolved.
- A bill of materials with original design codes and inventory mappings. Repeated requirements for one stock ID share the same available stock.
- Practical checks for each subassembly and an honest final verification status.

Check inventory while evolving the design. Exit code 3 means needs verification, not covered; code 1 means known shortage. Save the JSON result to inventory-check.json. A stock match does not prove mechanical fit.

Write numbered assembly instructions in Markdown and guide.json. Each step identifies newly added part codes/quantities, placement, orientation, and a meaningful check. Show local arrows, labels and exploded or sectional views when they help explain the connection. Decorative concept art cannot substitute for assembly diagrams.

The renderer supports editable programmatic diagram primitives in diagrams/*.json. Keep prior pieces muted, new pieces accented, and use labels matching the bill of materials. It can generate SVG sources/previews from those same primitives. Do not portray a generic block diagram as precise geometry.

Run python tools/render_guide.py designs/<slug>. It reads guide.json and parts.json, validates part-code totals, writes build-guide.pdf, and exports matching SVGs. Install requirements-guide.txt in a local virtual environment if needed. For non-Latin text pass fonts that cover the text using --font and --bold-font.

Render PDF pages to PNG using available Poppler/pdf tooling and inspect each page for clipping, legibility and missing symbols. Retain source files and note actual checks performed in VERIFICATION.md. Keep unverified physical-fit, electrical and dimensional assumptions visible in the guide.

For imported existing PDFs, preserve the original unchanged; do not imply editable source or a fresh PDF render was recovered. Record missing source/QA as such.
