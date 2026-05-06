# Workflows (Temporal)

Per `docs/Project-Structure.md` §3, durable workflows are defined here and
deployed as Temporal workers. None ship in Phase 1.

| Workflow | Phase | Trigger |
| --- | --- | --- |
| `visit-lifecycle/` | P2 | `visit.scheduled` |
| `lead-nurture/`    | P2 | `lead.created`    |
| `drip-campaign/`   | P3 | `campaign.started`|

Per-workflow folder layout: `src/activities/`, `src/workflows/`, `src/worker.ts`.
