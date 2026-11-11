# Verification

Status: prototype-needs-verification.

## Source checks
- Original supplied PDF preserved byte-for-byte; SHA-256 recorded in inventory/parts.json, source mini-palet-pdf.
- Required quantities transcribed from pages 2-4 and reconciled against the final table on page 19: F1 2, T1 36, W1 4, G8 8, G24 6, B1 10, B05 10, A3 2, A8 4, A12 2, P2 6, P3 2, M/L/BAT/RX/RC one each; total 97.
- Original document says the figures are schematic and physical assembly/CAD collision tests were not performed.

## Unresolved
- Exact gear identities/tooth counts, bush thickness, frame hole count and geometry.
- At least two 3L, four 8L and two 12L axles. The spare pack records only 30 mixed axles; the motor pack adds an unspecified assortment.
- Six 2L and two 3L friction pins; colors do not establish length or friction.
- Motor types, outputs, mounting, differences in speed/torque and independent remote control.
- Battery type/polarity requirements and electrical compatibility; batteries are not recorded as owned.
- Track tension, link-wheel engagement, clearances, structural stiffness and cable routing.

## Actual validation limits
Stock arithmetic and source-file integrity can be checked by the repository CLI/tests. Original pages 1-4 and 19 were rendered and visually inspected to reconcile requirements; a complete visual audit of all assembly pages was not performed. No physical build, CAD simulation or electrical test is claimed. Original diagram sources are unavailable.
