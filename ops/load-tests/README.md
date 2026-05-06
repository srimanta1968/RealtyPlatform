# Load Tests (k6)

Each scenario is a TS file mirroring a real user journey:

- `register-and-login.ts`
- `capture-lead.ts`
- `pipeline-throughput.ts`

Run via `k6 run ops/load-tests/<scenario>.ts`. Phase 1 placeholder — scenarios
land alongside the first production deploy.
