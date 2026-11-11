# LEGO Designs

## Repository commands and local skills

Interpret these as conversational commands, not terminal commands:
- /design [brief], /design surprise me: read [.agents/skills/design/SKILL.md](.agents/skills/design/SKILL.md) and follow it.
- /inventory [query], /inventory add [evidence]: read [.agents/skills/inventory/SKILL.md](.agents/skills/inventory/SKILL.md) and follow it.
Use these skills for equivalent natural-language requests too. They are also named $design and $inventory in skill-aware clients. Slash routing here does not require a client-side slash-command plugin.

Read inventory/parts.json and inventory/README.md before making stock claims. Query and validate with tools/inventory.mjs. Stock is reusable across designs; a saved design does not consume parts. Keep each model in designs/<slug>/, revisions within that folder, and shared stock only in inventory/.

Maximize creativity in concepts, mechanisms and play. Preserve user constraints and accept steering. Ask only questions that affect the outcome; do not repeat choices already made. Ground exact quantities and compatibility claims in evidence. Never present inferred geometry, product marketing, or schematic drawings as physical/CAD verification.

Preserve source assets. Use the validated importer for acquisitions; never edit receipts or lots to bypass its checks. Evidence corrections must reconcile the original lot and receipt together and pass validate. To correct verified inventory data, document the user's physical count and reconcile the original manifest rather than silently adding a replacement acquisition. Do not acquire extra parts unless requested.

## Verification
- Node.js >=20; no npm dependencies. Run npm test, npm run validate, npm run skills:validate.
- PDF tooling: python -m pip install -r requirements-guide.txt; python tools/render_guide.py <design-folder>.
- Keep tests in tests/, temporary evaluation data in .tmp/. Do not put test models into designs/.
- Read docs/formats.md before authoring JSON. Use the design template as a shape, not as a finished model.
- Preserve source citations and unresolved questions in each design's VERIFICATION.md.

<!-- CODEGRAPH_START -->
## CodeGraph
If a .codegraph/ directory exists at the repo root, use CodeGraph before grep/find or reading code to understand or locate implementation. Do not initialize an index automatically. Without that directory, skip CodeGraph.
<!-- CODEGRAPH_END -->
