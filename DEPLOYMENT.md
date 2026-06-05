# VentureForge Private Beta Deployment

VentureForge is ready for a few trusted private beta users when the checklist
below is complete. Keep the beta small until auth, persistence, guardrails,
exports, and mock-data labels have been verified on the deployed host.

## Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_SECRET`: cryptographically random secret, at least 32 characters.
- `NEXTAUTH_URL`: canonical HTTPS origin for Auth.js redirects.
- `NEXT_PUBLIC_APP_URL`: public HTTPS origin shown to browser code.
- `AUTH_TRUST_HOST`: usually `true` behind a trusted deployment proxy.

Credentials auth is the current provider, so no OAuth client ID or secret is
required. If OAuth is added later, store provider client IDs and secrets in the
deployment environment only.

## Optional Environment Variables

- `CENSUS_API_KEY`: optional Census connector key.
- `BLS_API_KEY`: optional BLS connector key.
- `OPENAI_API_KEY`: optional OpenAI API key for server-side AI enhancement.
- `OPENAI_MODEL`: model name to use with `OPENAI_API_KEY`.
- `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY`,
  `OPENAI_COMPATIBLE_MODEL`: optional OpenAI-compatible endpoint settings.
- `NEXT_PUBLIC_APP_VERSION` or `APP_VERSION`: optional version shown in health.
- `VERCEL_GIT_COMMIT_SHA` or `SOURCE_VERSION`: optional commit shown in health.

Optional keys are reported by `/api/health` as configured or missing. Missing
optional keys are not fatal.

## First Deploy To Vercel

### 1. Push to GitHub

From this project folder, confirm local-only files are ignored:

```bash
git status --short
git check-ignore .env .env.local .env.production node_modules .next test-results playwright-report
```

Then commit the app code and push it to GitHub:

```bash
git add .
git commit -m "Prepare VentureForge private beta deployment"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPO.git
git push -u origin main
```

Do not commit `.env`, `.env.local`, `.env.production`, database files, test
reports, or Playwright traces.

If you push from the parent Codex folder instead of this app folder, set the
Vercel project root directory to:

```text
VentureForge/SupportingBackend
```

### 2. Create a production PostgreSQL database

Use a managed PostgreSQL provider suitable for serverless apps. Good first-beta
options include a Vercel Marketplace Postgres integration, Neon, Supabase, or
another provider that gives you a pooled PostgreSQL connection string.

Create the database, then copy the provider's pooled production connection
string into `DATABASE_URL` in Vercel. Do not paste database URLs into source
code or commit them to GitHub.

### 3. Import the GitHub repo into Vercel

In Vercel:

1. Choose **Add New → Project**.
2. Import the GitHub repository.
3. If needed, set **Root Directory** to `VentureForge/SupportingBackend`.
4. Keep the install command as the Vercel default.
5. Keep the build command as `npm run build`.
6. Keep the output directory empty/default for Next.js.

`postinstall` runs `prisma generate`, so the Prisma client is prepared during
Vercel installs.

### 4. Add Vercel environment variables

In **Project Settings → Environment Variables**, add the required variables for
Production. Add Preview values too if you want preview deployments to work.

Required:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_TRUST_HOST=true`

Optional:

- `CENSUS_API_KEY`
- `BLS_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_API_KEY`
- `OPENAI_COMPATIBLE_MODEL`

For the first production deployment, set `NEXTAUTH_URL` and
`NEXT_PUBLIC_APP_URL` to the final Vercel URL or custom domain you plan to test.

### 5. Run Prisma migrations

After `DATABASE_URL` is set for the production database, deploy migrations once
before inviting testers:

```bash
npm run db:deploy
```

`db:deploy` runs `npx prisma migrate deploy`. Run it from a secure local shell
with production environment variables loaded, or from a trusted CI/deployment
job. Do not use `prisma migrate dev` against production.

### 6. Test the deployed app

After Vercel deploys:

1. Open `https://YOUR-APP.vercel.app/api/health`.
2. Confirm `database`, `auth`, and `environment` are `ok`.
3. Sign up with a fake beta tester account.
4. Create a project and reload the page to confirm persistence.
5. Log out and confirm protected pages redirect to login.
6. Run a market report and confirm mock/sample data is labeled if live keys are
   missing.
7. Export a Markdown business plan.
8. Confirm the private beta banner is visible.
9. Confirm sensitive-data warnings are visible and blocking works.

### Official Vercel docs

- Importing a Git repository:
  <https://vercel.com/docs/getting-started-with-vercel/import>
- Environment variables:
  <https://vercel.com/docs/projects/environment-variables>
- Marketplace storage and Postgres:
  <https://vercel.com/docs/marketplace-storage>

## Checklist

- `DATABASE_URL` is set and points to PostgreSQL.
- Auth variables are set: `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`.
- Prisma client is generated: `npm run db:generate`.
- Prisma migrations are deployed: `npm run db:deploy`.
- `/api/health` returns app, database, auth, optional provider, and build status
  without exposing secret values.
- Signup, login, logout, and authenticated redirects work.
- Project creation persists after reload and server restart.
- Dashboard only lists the signed-in user’s projects.
- User isolation has been verified by trying another user’s project URL.
- Private beta banner is visible globally.
- Mock-data warnings are visible in market research and exports.
- Sensitive-data blocking rejects SSNs, full card numbers, bank account numbers,
  passwords, private API keys, and private credit-report style content.
- Business-plan Markdown export works.
- Funding output states that final eligibility is determined by the lender or
  program.
- State checklist tells users to verify requirements with official agencies.

## Safety Copy For Testers

Private beta. Do not enter Social Security numbers, full bank account numbers,
credit card numbers, passwords, private tax records, or private credit reports.
Use estimates for planning.

## Verification Commands

```bash
npm run db:validate
npm run db:generate
npm run db:migrate
npm run typecheck
npm run test:beta
npm run smoke
npm run check
npm run test:e2e
curl https://your-beta-host.example.com/api/health
```

For production, `src/lib/env.ts` validates required variables with Zod. Missing
required variables fail clearly in production and appear as health-check
warnings in development/private-test environments.
