# State Program and Launch Compliance Engine

`StateProgramEngine.generateChecklist(project)` builds a deterministic,
location-aware launch-compliance checklist from validated JSON resource files.
It does not call an LLM and does not claim legal, tax, insurance, or licensing
compliance.

Seed files:

- `src/knowledge/state-programs/AZ.json`
- `src/knowledge/state-programs/PA.json`
- `src/knowledge/state-programs/CA.json`

Each state file includes top-level agency metadata, common setup tasks,
industry-specific applicability flags, source reliability, last-verified dates,
and `needsVerification` flags. Each task mirrors the practical Prisma
`StateProgram` fields and adds checklist metadata: applicability triggers,
timing, dependencies, estimated difficulty, founder notes, verification
metadata, and optional URLs. Missing URLs are allowed only when the resource is
clearly marked as needing direct agency verification.

To add a state:

1. Add a validated JSON resource file in `src/knowledge/state-programs`.
2. Import and register it in `resource-loader.ts`.
3. Use official agency URLs where possible and update `lastVerifiedAt`.
4. Mark uncertain or local placeholder records with `needsVerification: true`.
5. Use `toStateProgramPersistenceRecord(resource)` if persistence services need
   to store individual resource records.
6. Run the developer audit helpers:
   - `listStatesWithMissingUrls()`
   - `listResourcesNeedingVerification()`
   - `listResourcesOlderThan(180)`
7. Add state-specific tests.

Local licensing, zoning, and activity-specific rules still require direct
verification with the applicable state, city, county, and professional agency.
