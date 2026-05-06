# Agents

Per `docs/Project-Structure.md` §7, agents are **separately deployed processes**
subscribed to specific events. They share `@kiana/ai-client` for AI Gateway
access and `@kiana/event-bus` for the subscription transport.

The Phase 1 sprint does **not** ship any agents. The folders below are intentional
placeholders so the workspace contract (apps / bffs / services / agents / packages)
is visible from the root.

| Agent | Phase | Triggers |
| --- | --- | --- |
| `qualification-agent/`        | P3       | `lead.created`             |
| `scoring-agent/`              | P3 → P6  | `engagement.*`             |
| `matching-agent/`             | P4       | `lead.qualified`, `visit.outcome` |
| `visit-summary-agent/`        | P4       | `visit.completed`          |
| `recommendation-agent/`       | P5       | `customer.shortlist_updated` |
| `nba-agent/`                  | P2 → P6  | stage change, inactivity   |
| `property-intelligence-agent/`| P6       | scheduled                  |
| `campaign-copy-agent/`        | P6       | `campaign.draft_requested` |
