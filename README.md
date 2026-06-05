# VentureForge service foundation

This workspace is the server-ready companion to the native VentureForge macOS
application. It intentionally contains architecture, persistence, seed data,
shared contracts, and extension boundaries only. Feature modules will be added
one at a time.

## Stack

- Next.js 16 with React Server Components
- TypeScript
- Tailwind CSS
- PostgreSQL with Prisma
- Auth.js credentials authentication
- Zod

## Setup

```bash
cp .env.example .env
npm install
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Private beta deployment

VentureForge is ready for trusted private testing only after the production
environment is configured and the health check passes.

Required production variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_SECRET`: random secret of at least 32 characters.
- `AUTH_TRUST_HOST`: usually `true` behind a trusted hosting proxy.
- `NEXTAUTH_URL`: canonical Auth.js URL for the local or deployed app.
- `NEXT_PUBLIC_APP_URL`: public beta URL, such as `https://beta.example.com`.

Credentials auth is currently the configured auth provider, so no OAuth client
ID/secret is required. If an OAuth provider is added later, keep its provider
ID and secret in the deployment environment, not in source code.

Optional provider variables:

- `CENSUS_API_KEY`: enables official Census market indicators.
- `BLS_API_KEY`: enables official BLS labor-market indicators.
- `OPENAI_API_KEY` and `OPENAI_MODEL`: enable optional server-side LLM
  enhancement against OpenAI's API.
- `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY`,
  `OPENAI_COMPATIBLE_MODEL`: enable optional server-side LLM enhancement
  against another OpenAI-compatible endpoint.
- `GRANTS_API_KEY` and `SAM_GOV_API_KEY`: reserved for future live connectors.

Validate beta readiness:

```bash
npm run typecheck
npm run check
curl https://your-beta-host.example.com/api/health
```

Deployment checklist:

- Provision PostgreSQL and set `DATABASE_URL`.
- Generate `AUTH_SECRET` with `openssl rand -base64 33`.
- Set `NEXTAUTH_URL` to the deployed HTTPS origin.
- Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin.
- Run `npm run db:migrate` against the production database.
- Run `npm run db:seed` only if the beta should include sample data.
- Confirm `/api/health` reports the app and database as healthy.
- Confirm sign-up, login, logout, project creation, and project deletion.
- Confirm the private beta banner appears on every page.
- Keep optional Census/BLS/LLM keys blank until you are ready to test them.
- Tell testers not to enter SSNs, full bank data, credit card numbers,
  private credit reports, passwords, or private account logins.

See `DEPLOYMENT.md` for the full private beta deployment checklist.

## First deploy to Vercel

Use `DEPLOYMENT.md` as the step-by-step checklist. The short version is:

1. Confirm local secrets and build output are ignored:

   ```bash
   git check-ignore .env .env.local .env.production node_modules .next test-results playwright-report
   ```

2. Commit the project and push it to GitHub:

   ```bash
   git add .
   git commit -m "Prepare VentureForge private beta deployment"
   git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPO.git
   git push -u origin main
   ```

3. Create a production PostgreSQL database. Vercel Marketplace Postgres, Neon,
   Supabase, or another managed PostgreSQL provider can work for a private beta.
   Copy the provider's pooled production connection string into Vercel as
   `DATABASE_URL`.

4. Import the GitHub repository into Vercel. If the repository root is the
   parent Codex folder, set Vercel's **Root Directory** to:

   ```text
   VentureForge/SupportingBackend
   ```

5. Add production environment variables in Vercel:

   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_TRUST_HOST=true`
   - `NEXTAUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
   - optional: `CENSUS_API_KEY`, `BLS_API_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`

6. Deploy database migrations after the production `DATABASE_URL` is available:

   ```bash
   npm run db:deploy
   ```

   `db:deploy` runs `npx prisma migrate deploy`. Do not run
   `prisma migrate dev` against production.

7. Test the deployed app:

   - Open `/api/health` and confirm app, database, auth, and environment are ok.
   - Sign up with a fake beta account.
   - Create a project, reload, and confirm it persists.
   - Log out and confirm protected pages redirect to login.
   - Generate and export a Markdown business plan.
   - Confirm private beta, mock-data, funding, state-verification, and financial
     estimate warnings are visible.

Helpful Vercel docs:

- [Import a Git repository](https://vercel.com/docs/getting-started-with-vercel/import)
- [Environment variables](https://vercel.com/docs/projects/environment-variables)
- [Marketplace storage](https://vercel.com/docs/marketplace-storage)

`DATABASE_URL` is required for the running app, migrations, and seeds. It must
point to a reachable PostgreSQL database. For local schema development, use
`npm run db:migrate:dev`; for a shared test or production server, use
`npm run db:migrate`.

On some macOS external-drive workspaces, Prisma's dynamic query-engine library
can hit a local code-signing loader warning. The Prisma generator is configured
to use the binary engine to avoid that loader path. If you override it locally,
regenerate and run with:

```bash
PRISMA_CLIENT_ENGINE_TYPE=binary npm run db:generate
PRISMA_CLIENT_ENGINE_TYPE=binary npm run test:transactions
```

Authentication also requires `AUTH_SECRET`, a cryptographically secure random
string of at least 32 characters, and `NEXTAUTH_URL`, the canonical URL Auth.js
uses for callbacks and redirects. A local secret can be generated with:

```bash
openssl rand -base64 33
```

Set `AUTH_TRUST_HOST="true"` for local Docker/reverse-proxy style testing or
when the deployment platform requires trusted forwarded host headers.

### Live Census and BLS data

The market-research engine can use official Census API data when
`CENSUS_API_KEY` is set. The live connector currently normalizes ACS 5-year
profile indicators, County Business Patterns establishment counts, and
Nonemployer Statistics where the selected geography and NAICS sector are
available.

The engine can also use official BLS labor-market data when `BLS_API_KEY` is
set. The live BLS connector currently normalizes Local Area Unemployment
Statistics labor-market series and a national Current Employment Statistics
hourly-earnings series where available. Detailed OEWS occupational wage tables
are scaffolded for a future connector pass.

If either live-data key is blank, the app still works and falls back to visibly
labeled mock/sample market data where needed. Census and BLS outputs are still
planning inputs only: verify source details, margins of error, local
conditions, and hiring assumptions before relying on them for spending
decisions.

### Private testing data safety

During private testing, use planning estimates and plain descriptions only.
Do not enter Social Security numbers, full bank account numbers, routing
numbers, private credit reports, passwords, private account logins, credit card
numbers, private API keys, private tax records, or tax IDs unless absolutely
necessary. Money fields are intended for rough estimates, not bank/account
details.

`src/lib/security/sensitiveInputScanner.ts` checks project creation, intake
updates, Guided Builder drafts, repository writes, and optional AI enhancement
inputs. High-risk patterns are blocked before saving, before generation runs
from project input, or before calling an LLM.
EIN-like values produce a caution instead of a hard block because a tax ID may
occasionally be relevant, but testers should avoid entering it.

`src/lib/env.ts` validates production environment variables with Zod.
`/api/health` checks app readiness, database reachability, auth-secret
configuration, and optional provider configuration without exposing secrets.
Generation, provider, auth, export, and database failures use the safe logger in
`src/lib/logging/safeLogger.ts`, which redacts sensitive-looking values before
writing structured logs.

Private beta abuse guards are intentionally simple and in-memory:

- Engine generation requests are rate limited per user and module.
- Market-data generation has a tighter per-minute limit because it may call live
  public data APIs.
- Exports are rate limited per user and export type.

For a public launch, replace the in-memory limiter with a shared store such as
Redis or the hosting platform's edge rate-limiting product.

`db:seed` expects a reachable PostgreSQL database. To validate the five project
fixtures, three seeded states, and official-resource records without a running
database:

```bash
npm run db:seed:check
```

Production verification:

```bash
npm run typecheck
npm run build
```

## Architecture

- `src/app`: thin server-rendered Next.js entrypoint
- `src/engine`: pipeline contracts and future business-development modules
- `src/providers`: official, manual, mock, and plugin provider boundaries
- `src/ai`: centralized optional LLM boundary, prompts, and output schemas
- `src/knowledge`: methodology-pack catalog
- `src/lib`: server-side infrastructure such as the Prisma singleton and repositories
- `src/exports`: export-provider contracts
- `prisma/schema.prisma`: practical PostgreSQL domain model
- `prisma/seed-data.ts`: pure, validated fixtures
- `prisma/seed.ts`: PostgreSQL seeder with `--dry-run` support

The shared `EngineResult<T>` type requires confidence, assumptions, missing
information, warnings, sources, and next actions. React components must not
contain business-development rules.

Every validated engine, plugin, and AI result passes through the shared
guardrail normalizer in `src/engine/shared/guardrails.ts`. It adds the
planning-only, no-success-guarantee, no-funding-guarantee, professional-review,
official-agency-verification, and estimated-data warnings. Any result with a
mock source also receives an explicit mock-data warning. The workspace and
Guided Builder show a compact version of these boundaries before presenting
generated outputs.

## Project workspace shell

The direct engine workspace lives under `/dashboard` and
`/project/[id]/overview`. Each project module has its own route, but all routes
call the same server-side orchestration boundary:

- `src/lib/project-workspace/orchestrator.ts`: orders prerequisite engine runs
  and adapts rich reports only where an older engine expects a narrower input
- `src/lib/project-workspace/traceability.ts`: describes the visible pipeline
  and projects stored `EngineResult` metadata into `/project/[id]/traceability`
- `src/lib/repositories/projectRepository.ts`: PostgreSQL-backed project workspace persistence
- `src/lib/repositories/founderRepository.ts`: founder profile data access
- `src/lib/repositories/businessIdeaRepository.ts`: business idea data access
- `src/lib/repositories/engineOutputRepository.ts`: lossless engine-result persistence plus normalized output records
- `src/app/api/projects`: thin API routes for create, edit, load, and run
- `src/components/project-shell`: reusable display-only workspace components

Project creation, detailed intake, Guided Builder drafts, and generated engine
outputs are stored in PostgreSQL. `src/lib/project-workspace/testMemoryStore.ts`
exists only for deterministic unit tests; production routes do not import it.
Project APIs require an authenticated Auth.js session. On first login,
VentureForge upserts a matching `User` record, and every project is created
with that user’s `userId`. Repository lookups are owner-scoped so one account
cannot read or update another account’s projects.

Project detail routes, engine generation, Guided Builder autosaves,
traceability, and export APIs use `src/lib/auth/requireProjectAccess.ts`.
That helper checks both authentication and `project.userId` before returning
project data. Lower-level repositories also require `userId` for user-facing
project reads and writes, so accidental project-ID-only calls fail closed.
Major generation and export events are recorded in `DataSourceLog` with
`userId`, `projectId`, `action`, `sourceType`, and timestamp metadata.

Engine generation writes are transaction-safe. `EngineOutput` tracks
`pending`, `completed`, and `failed` status plus sanitized retry information.
Multi-record replacements such as business-plan sections, funding matches,
launch tasks, and website pages use repository-level transactions, so failed
regeneration rolls back instead of leaving partial records. Regeneration
replaces controlled record sets intentionally rather than creating duplicate
sections, tasks, matches, or pages.

Project pages include a project-delete control. The dashboard includes a
private-testing scaffold to delete all project data for the signed-in account
while preserving the login record.

## Export system

`src/exports` contains a format-specific export layer that consumes validated
engine results without changing engine logic:

- Markdown and HTML business-plan exports include section content, assumptions,
  sources, warnings, and missing information.
- Funding-checklist and launch-roadmap CSV exports use spreadsheet-safe quoting.
- Static website export creates a ZIP archive containing `index.html`,
  `about.html`, `services.html`, `contact.html`, `faq.html`, and `styles.css`.
- PDF and DOCX exporters are honest scaffolds until reviewed server-side
  rendering dependencies are installed.

Every export preserves visible mock-data warnings when any source is labeled
`mock`.

The export API at `/api/projects/[id]/exports` is also owner-scoped. It records
an `ExportRecord` and audit log only after the current user has access to the
project.

## Optional AI enhancement

Deterministic engines work without an LLM. Optional AI services live behind the
centralized `LLMClient` interface and validate structured JSON output with Zod
before exposing it to the app.

To configure an OpenAI-compatible server-side endpoint, set:

```bash
OPENAI_API_KEY=""
OPENAI_MODEL=""
OPENAI_COMPATIBLE_BASE_URL=""
OPENAI_COMPATIBLE_API_KEY=""
OPENAI_COMPATIBLE_MODEL=""
```

For OpenAI's API, set `OPENAI_API_KEY` plus `OPENAI_MODEL`. For another
OpenAI-compatible endpoint, set all three `OPENAI_COMPATIBLE_*` values. If the
key/model settings are incomplete, VentureForge uses the disabled client and
continues with deterministic output only.

## Plugin architecture

Engine plugins live in `src/engine/plugins`. The registry validates metadata,
configuration, source labels, confidence, and the shared `EngineResult`
structure before accepting plugin output. Disabled plugins cannot run. Invalid
output is rejected safely.

`PluginConfigPersistenceHooks` maps onto the Prisma `PluginConfig` model while
keeping the engine independent from the database implementation.

## Business Builder walkthrough

The beginner-first experience lives at `/project/[id]/builder`. It presents one
plain-language question at a time while preserving the user’s raw wording and
mapping answers into existing engine inputs.

- `src/engine/guided-builder`: deterministic schemas, the 14-stage catalog,
  beginner help definitions, answer mapper, and progress service
- `src/components/guided-builder`: walkthrough layout, question controls,
  Review Mode, Pro Mode, coach messages, financial summary, state checklist,
  plan cards, and website starter preview
- `e2e/guided-builder.spec.ts`: Playwright coverage for the primary guided path

Guided Mode is the default. Review Mode translates engine-facing fields back
into plain sections. Pro Mode exposes structured values, assumptions, and raw
engine inputs for advanced users. React components do not contain business
scoring rules.

Run the walkthrough browser suite with:

```bash
npm run test:e2e
```

The command builds the app first and runs the Playwright scenarios against the
production Next server for stable external-drive verification.

### Private beta full-flow test

The private beta flow is covered by
`e2e/private-beta-full-flow.spec.ts`. It signs up a test user, creates a
project, completes the beginner Guided Builder with an “I’m not sure” answer,
generates the core planning modules, checks critical guardrails, views
traceability, exports a Markdown business plan, and verifies logout/access
protection.

Fixtures live in `e2e/private-beta-fixtures.ts`:

- Vinyl record store in Tempe, Arizona
- Food truck in Phoenix, Arizona

Run only the private beta journey:

```bash
npm run smoke
```

`npm run smoke` builds the production Next app and runs
`e2e/private-beta-full-flow.spec.ts`. Use it before inviting private beta
testers. The older alias `npm run test:e2e:private-beta` runs the same
Playwright spec.

Or, if your local shell is missing `npm`, run the installed binaries directly:

```bash
./node_modules/.bin/next build --webpack
./node_modules/.bin/playwright test e2e/private-beta-full-flow.spec.ts
```

## Methodology pack

`src/knowledge/frameworks` contains twelve concise, original JSON methodology
files. Each file follows the same schema and is parsed with Zod before use.

Loader utilities:

- `loadKnowledgeFile(id)`: load and validate one allowlisted framework
- `loadAllKnowledgeFiles()`: load and validate the complete methodology pack
- `getFrameworkById(id)`: return one validated framework or `undefined`

Validate the pack:

```bash
npm run knowledge:validate
```
