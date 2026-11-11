# Skill workflow review

These are manual, same-session dry-run evaluations of the local instructions, not independent-agent or live-product-browser tests. Automated stock/CLI/PDF tests live in tests/. No evaluation acquisition was added to real stock and no test model was saved in designs/.

| Request | Reviewed behavior | Result / limit |
| --- | --- | --- |
| /inventory | Query existing stock; summarize 72 records, unknown motor-kit counts and 30 total spare axles; no writes | CLI list and repository validation exercised; no write needed |
| /inventory what can drive tracks? | Reason across motors, tracks, wheels, gears, power and controls | Candidate M/L-looking motors and wide links identified; motor pairing, teeth and fit remain unverified |
| /inventory with both original screenshots | Interpret product evidence without adding stock | Initial evidence is already attached to two receipts; another view is not another acquisition |
| /inventory add this kit, two copies | Inspect selected kit, multiply per-kit counts by two, preview and import once | Automated copy/import/replay tests exercised; uncertainty retained |
| /inventory add a 30-piece axle assortment | Record 30 total, with unknown per-length distribution | Real initial inventory records this correctly; A12 remains unresolved |
| /inventory with an inaccessible product URL | Use accessible evidence, explain missing contents; inspect only unless ownership/addition explicit | Instruction review only; no arbitrary product URL was supplied for a live browser test |
| /design a LEGO tank with a palette | Preserve the theme, clarify whether palette means colors or tracks if context does not resolve it | Do not silently reinterpret the brief; then compare creative mechanism options against stock |
| /design and /design surprise me | Pitch distinct experiences and silhouettes, recommend one, then wait for selection | Plausible directions include a tracked kinetic creature, a walking linkage experiment and an animated mechanism display; these are pitches, not validated models |
| Make it smaller and use the other motor | Keep the active concept and saved progress, revise mechanisms and stock requirements | Instructions retain steering without forcing the user to restart an intake form |
| A design needing four 12L axles | Do not use the mixed axle total as proof of exact-size stock | Automated unmapped/uncertain stock tests and Mini Palet R1 check keep this unresolved |
| A concept needing extra parts | Redesign using stock or explicitly discuss changing the brief | No purchase flow or outside acquisition is authorized by an ordinary design request |

No physical build, CAD collision test, motor-control test or independent conversational-agent run was performed. New real-world product evidence and physical counts should be used to refine these skills through observed behavior rather than adding rigid generic rules.
