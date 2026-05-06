# `user_db` — Migrations

Owner: `services/user-service`.

Migrations are run via `pnpm --filter @kiana/user-service db:migrate` (Drizzle).
In Phase 1 all DBs share one Postgres cluster — the connection string lives in
`DATABASE_URL`, fallback to `DB_*` env vars (see `.env.example`).
