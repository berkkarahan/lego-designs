# LEGO Designs

An inventory-aware design notebook with local conversational skills, illustrated model folders and a dependency-free inventory CLI.

## Start a conversation
- /inventory - summarize stock.
- /inventory what motors and tracks do I have? - reason about existing parts.
- /inventory <product URL or screenshot> - inspect and compare; do not add stock.
- /inventory add <product URL or screenshot> - add one owned kit unless you specify more.
- /design a LEGO tank with tracks - collaborate on a directed model.
- /design or /design surprise me - get contrasting original concepts, then choose or steer.

These are repository conversational shortcuts routed by [AGENTS.md](AGENTS.md). In clients supporting native local skill discovery, the skills are also named $design and $inventory. Reload the project/session if newly created local skills are not yet listed. They guide an agent; there is no unattended model-generation service or custom slash-command extension.

## Inventory and designs
- [Inventory and evidence](inventory/README.md)
- [Mini Palet R1](designs/mini-palet-r1/README.md) - imported original guide and extracted parts list.
- [New-design template](templates/design/README.md)
- [JSON contracts](docs/formats.md)

Stock is reusable across all designs. Unknown counts, candidate standard identities and untested physical fit remain explicit. No inventory comparison certifies that a model will assemble or run.

## CLI
Requires Node.js >=20; no npm packages to install.
```sh
node tools/inventory.mjs list
node tools/inventory.mjs list axles --json
node tools/inventory.mjs validate
node tools/inventory.mjs check designs/mini-palet-r1 --json
node tools/inventory.mjs import inventory/imports/initial-motor-kit.json --dry-run --json
npm test
npm run skills:validate
```

check exits 0 for covered stock, 1 for shortage, 2 for input errors, and 3 for needs verification. Initial imports are already applied; repeating them is a no-op.

## Illustrated guides
The original Mini Palet R1 PDF is preserved byte-for-byte. Its source artwork was not supplied.

New designs retain guide.json, diagrams/*.json and generated matching SVGs. The PDF renderer requires Python >=3.10 and the packages in requirements-guide.txt:
```sh
python -m venv .venv
# Activate the environment using your shell, then:
python -m pip install -r requirements-guide.txt
python tools/render_guide.py designs/<slug> --font <regular.ttf> --bold-font <bold.ttf>
```

For ASCII text, the renderer can use built-in fonts. Unicode text requires a font that covers it; DejaVu Sans or the Windows Arial fonts are suitable for Turkish. Review rendered PDF pages with Poppler or an available PDF viewer before marking a guide complete.

## Development verification
Install requirements-dev.txt in the local Python environment to run the complete suite (including PDF tests), then run npm test. See [verification results](docs/verification.md) and the [manual skill workflow review](docs/skill-evaluations.md).

## Provenance
The requested [shared conversation](https://chatgpt.com/share/6af41900-d034-83ed-8602-5bbe56e03aa8) returned a preview without conversation content. Inventory and the first design therefore come from the two supplied screenshots and the supplied PDF. No unavailable conversation content was reconstructed.

## License
Original code, skills, templates, data structures and documentation are [MIT licensed](LICENSE). See [asset and trademark notices](NOTICE.md) for the supplied screenshots and PDF.
