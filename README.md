# MTC Work Order Platform

Custom work-order management platform for MTC Facility Solutions, replacing JobFlowGo. Covers work-order intake, vendor dispatch, quoting (with NTE/DNE enforcement), completion sign-off, and invoicing for MTC's commercial accounts, with a planned residential track.

See `docs/data-model.md` for the design rationale and what this deliberately does differently from JobFlowGo.

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

## Project structure

```
src/
  app/            route pages (App Router)
  lib/            Supabase client, server utilities
  types/          shared domain types (work orders, quotes, vendors, ...)
docs/
  data-model.md   entity design + JobFlowGo review findings
```
