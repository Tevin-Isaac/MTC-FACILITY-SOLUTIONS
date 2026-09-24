# MTC Work Order Platform

Custom work-order management platform for MTC Facility Solutions, replacing the previous third-party dispatch tool. Covers work-order intake, vendor dispatch, quoting (with NTE/DNE enforcement), completion sign-off, and invoicing for MTC's commercial accounts, with a planned residential track.

See `docs/data-model.md` for the design rationale and what this deliberately does differently from the previous system.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + Storage)

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase credentials, the app runs fine on sample data (`src/lib/mock-data.ts`) and skips login — this is expected for local prototyping, not a bug.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough to start).
2. In the project's SQL Editor, run `supabase/migrations/0001_init.sql` — this creates every table, the `profiles`/role setup, and row-level security policies.
3. From Project Settings → API, copy the **Project URL** and **anon public** key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # Settings → API → service_role — server-only, never expose client-side
   ```
4. Restart `npm run dev`. Login is now enforced (`src/middleware.ts`) and `/login` is live.
5. Create your first staff account: Authentication → Users → Add user in the Supabase dashboard (or sign up via a route you add later). A `profiles` row is created automatically on signup with role `coordinator` — update it to `owner` or `admin` for yourself directly in the table editor.
6. On Vercel, add the same three variables under Project Settings → Environment Variables, then redeploy.

The app still reads from `src/lib/mock-data.ts` for now — connecting Supabase enables auth, but wiring the actual data fetching to Postgres (replacing the mock-data functions with real queries against the schema above) is the next step once a project exists.

## Project structure

```
src/
  app/            route pages (App Router)
  app/login/      sign-in page
  lib/supabase/   Supabase client (browser + server) and env check
  middleware.ts   session refresh + route protection
  types/          shared domain types (work orders, quotes, vendors, ...)
docs/
  data-model.md   entity design + design rationale
supabase/
  migrations/     SQL schema (run 0001_init.sql on a new project)
```
