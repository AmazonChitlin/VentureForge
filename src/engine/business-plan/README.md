# Business Plan Engine

The deterministic business-plan engine converts prior VentureForge engine
outputs into editable planning documents. It supports six plan variants while
keeping the canonical 21-section traditional plan as the complete model.

Each generated section stores its narrative, editable content, confidence,
missing research, assumptions, source notes, quality checklist, lock state, and
regeneration metadata. Lock a founder-approved section before regenerating to
preserve its narrative and edits while upstream evidence changes.

The persistence adapters map the editable model to the existing Prisma
`BusinessPlan` and `BusinessPlanSection` fields without moving business logic
into UI components.
