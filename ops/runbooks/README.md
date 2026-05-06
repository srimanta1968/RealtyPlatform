# Runbooks

One runbook per service. Each describes:

- **Health checks** — what `/health` and `/health/ready` indicate
- **Common alerts** — Prometheus / OTel alert names + first-response actions
- **Escalation** — who to page, when
- **Rollback** — how to revert a bad deploy via Argo CD
- **Data recovery** — point-in-time restore procedures for the service's DB

Phase 1 placeholder — runbooks are written when each service first hits production.
