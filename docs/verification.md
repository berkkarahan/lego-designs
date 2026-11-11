# Implementation verification

## Automated suite
Run npm test (node tests/run.mjs). It runs:
- Seven unit cases: aggregation, uncertainty, mixed evidence, shortage precedence, copy/import identity, invalid records and conflicting evidence.
- Four integration cases: validated atomic imports, source integrity/path containment, concurrent lock behavior and the real repository's saved comparison.
- One executable CLI end-to-end case covering queries, all comparison exit states, dry-run, commit, replay, validation and input errors.
- Five Python guide cases: PDF/SVG output and text bounds, parts-total errors, diagram bounds, path containment and Turkish fonts.
- Local skill format/reference validation.

There are 17 behavioral tests total. They use real files; CLI E2E runs the actual executable entry point in a temporary repository. Test output uses ordinary files for subprocess capture because this Windows sandbox rejects subprocess pipes. All categories passed with no skips.

Install requirements-dev.txt in a local Python environment before the full suite. tests/run.mjs chooses PYTHON if set, then the local .venv interpreter, then python. Node-only tests can be run separately with node tests/inventory.test.mjs.

## Skill validation
Both skills passed the skill-creator quick_validate.py helper and the local Node validator. The optional bundled Bash feature-radar checker could not start because this sandbox denies Git Bash's signal pipe (Win32 error 5); its relevant name/description-length/reference checks are covered by the functioning validators. There is no .feature-radar content in this repo.

## Source and visual checks
All three supplied files were copied byte-for-byte and their SHA-256 values are recorded and validated by the CLI. Mini Palet R1's 17 requirement lines total 97 items and match pages 2-4 and 19 of the original PDF.

Generated a two-page renderer fixture in ignored .tmp/, inspected both rendered PNG pages, and checked Turkish glyphs, diagram labels/arrows, instruction wrapping, margins and footers. Inspected original PDF pages 1-4 and 19 to reconcile source requirements and limitations. The original PDF remains unchanged.

## Boundaries
No real model was assembled or electrically tested. No CAD validation or independent-agent conversation evaluation was performed. The initial model needs physical verification; ambiguous parts are preserved rather than represented as known shortages or buildable stock. See skill-evaluations.md for the manual workflow review.
