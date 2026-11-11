---
name: design
description: "Collaboratively invent and document LEGO-compatible models using this repository's parts inventory. Use for /design, /design surprise me, or a directed LEGO model brief. Produces illustrated build instructions and a separate design folder; inventory-only questions belong to inventory."
---

# Design

Work from the repository root containing inventory/parts.json. Read inventory/README.md, query the CLI, and inspect existing designs before developing a concept. Read [conversation guidance](references/conversation.md) for open-ended or directed requests and [build guidance](references/build.md) when developing the selected concept.

## Invent, then collaborate

For /design or /design surprise me, offer several genuinely distinct inventory-informed concepts, recommend one, and let the user select or steer. Do not choose and finish a surprise concept before that interaction. For a directed brief, preserve its defining idea and explore interesting mechanisms, forms and play features. Clarify consequential ambiguity only when context cannot resolve it (for example "palette" could mean a color palette or tracked running gear).

Maximize creativity rather than imposing a genre, difficulty or standard chassis. Owned parts are creative material. Reason independently about possible mechanisms, use surprising combinations, and adapt to user steering throughout. Ask one question at a time only when its answer changes the design. Infer routine decisions and state important assumptions. Match the user's conversational language.

## Build against evidence

- Prefer owned stock. Saved designs do not reserve it; previous models can be dismantled.
- Read the actual inventory and verification notes. Do not treat estimated motor counts, unknown axle sizes or candidate gear identities as confirmed.
- Use the sibling inventory skill when interpreting new stock evidence. Product inspection does not itself add owned parts.
- Develop mechanisms, structure, controls and assembly order. Maintain parts.json and use node tools/inventory.mjs check designs/<slug> --json as the design changes.
- Resolve shortages by redesign where possible. Discuss a change to the brief before planning purchases. Keep blocked and uncertain designs as explicit prototypes, not "ready to build".
- Create designs/<slug>/ for each new model; keep revisions inside it. Do not overwrite another design.
- Save README.md, parts.json, inventory-check.json, guide.json, editable diagram sources, assembly instructions, a PDF guide and VERIFICATION.md. Preserve session decisions and next steps so another session can continue.
- Keep part codes consistent across stock mapping, diagrams, steps and totals. Do not invent physical testing, standard dimensions, CAD collision checks or functional validation.

Read docs/formats.md before authoring machine-readable outputs. Generate PDFs using the reusable renderer and the installed PDF skill where available. Inspect rendered PDF pages and fix visual defects before calling the guide complete.
