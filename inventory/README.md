# Owned parts

The owner confirmed one complete motor kit and one complete spare-parts kit from the supplied screenshots. Stock describes the product evidence; no physical count or fit check has been performed.

- [Motor kit evidence](sources/motor-kit.png)
- [Spare-parts evidence](sources/spare-parts-kit.png)
- [Canonical stock and receipts](parts.json)
- [Reproducible import manifests](imports/)

Spare-kit printed xN labels are recorded counts. Motor-kit individual-object counts are visual estimates. Unreadable counts remain null. Names and standard-equivalent identities may be inferred separately from quantities. Gear teeth, axle lengths and electronics need inspection. Descriptive identity "identified" does not certify standard LEGO geometry or branding.

The spare axle pack has 30 total pieces across unknown sizes. Similar items from the motor kit remain separate until a match is established. Permanently attached cables, front/back views and subcomponents of counted assemblies are not extra stock.

Use /inventory for a summary or a stock question. /inventory <link or screenshot> inspects only; /inventory add ... or an explicit ownership statement imports one kit unless another count is specified. Additional photos of the same kit do not increase quantities.

Use the CLI:
```sh
node tools/inventory.mjs list motors
node tools/inventory.mjs list --json
node tools/inventory.mjs check designs/mini-palet-r1 --json
node tools/inventory.mjs import inventory/imports/initial-spare-kit.json --dry-run
node tools/inventory.mjs validate
```

Do not edit committed manifests to silently change their meaning. For physical-count corrections, preserve the original evidence, document the correction and update its canonical lot and receipt consistently; validate afterward. A correction is not another acquisition.

Receipts live in the same canonical file as stock, so a failed import cannot leave committed quantities without their receipt. A .lock refuses concurrent writes; never remove it without checking that no import is running.

All saved designs can reuse all stock. There is no reservation ledger.
