# SportStats

SportStats is a mobile-first Tennis statistics platform with a sport-agnostic data foundation.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server on the configured `PORT`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — PostgreSQL/Drizzle source of truth for sports, players, seasons, tournaments, matches, results, sets, statistics, and rankings
- `lib/api-spec/openapi.yaml` — source of truth for the REST contract
- `artifacts/api-server/src/routes/sports.ts` — validated sports API routes and dynamic statistics/H2H calculations
- `artifacts/api-server/src/lib/seed.ts` — small idempotent demo dataset only
- `artifacts/sportstats/src/` — React/Vite dashboard and profile pages

## Architecture decisions

- Internal identity columns remain stable while `source` + `externalId` provide import-safe provider identity and duplicate protection.
- Seasons, ranking snapshots, match results, and match statistics are separate entities so historical imports do not overwrite current profile fields.
- H2H is derived from completed match rows with a strict `match.date < target.date` boundary; it is not stored as a stale aggregate.
- Existing `date`, `winnerId`, `resultSummary`, and `season` fields remain for V1 API/UI compatibility while richer import relationships are added alongside them.

## Product

- Dashboard with live, upcoming, today, and recent completed Tennis matches
- Match scorecards with set breakdowns and pre-match H2H context
- Player and tournament profiles
- Search across players, tournaments, and matches

## User preferences

- Keep the demo dataset small and optimize the architecture for real sports-data imports.

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, run API code generation before typechecking.
- Imported entities should always provide a stable `(source, externalId)` pair; the schema protects that pair with unique indexes.
- Use `pnpm --filter @workspace/db run push` for development schema changes; production schema changes are applied through Publish.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
