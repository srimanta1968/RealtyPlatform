# Phase 2 — Operations Backbone

**Theme:** Process discipline — the lead-to-visit-to-follow-up journey runs on the system, not human memory
**Duration (target):** 6–8 weeks
**Outcome:** Every lead has a next action. Every visit has an outcome. Leadership sees the funnel daily.

---

## 1. Phase Goal

Phase 1 captured leads. Phase 2 makes the **operational machine** real:

- Pipeline stages enforced by workflow, not goodwill
- Visits scheduled, assigned, executed, and closed inside the system
- Tasks and follow-ups generated automatically (rule-based)
- Basic analytics so leadership can answer "how are we doing?" without asking anyone

---

## 2. In Scope

- Full CRM Service (pipeline, tasks, SLAs, ownership rules)
- Visit Service (scheduling, assignment, lifecycle, outcome capture)
- Analytics Service (basic funnel and conversion dashboards)
- Notification Service expanded (reminders, SLA breaches)
- WhatsApp Business API integration (templates only — no chatbot)
- Rule-based **Next-Best-Action** logic (no LLM)

## 3. Out of Scope

- Campaign automation (Phase 3)
- Field mobile app (Phase 4)
- LLM-driven intelligence (Phase 3+)
- Customer self-service portal (Phase 5)

---

## 4. Microservices

| Service | Status | Change |
| --- | --- | --- |
| **CRM / Workflow Service** | UPGRADE | From lite to full pipeline + task engine + SLAs |
| **Visit Service** | NEW | Scheduling, assignment, outcomes |
| **Analytics Service** | NEW | Funnel, conversion, source attribution |
| **Notification Service** | EXTEND | Reminder scheduling, SLA breach alerts, WA Business API |
| **Workflow Engine** | NEW (infra) | Temporal cluster (or equivalent) for long-running flows |
| **Event Bus** | NEW (infra) | Kafka / SNS+SQS — formal rollout |

### 4.1 CRM Service — APIs

```
GET    /v1/pipeline                 Aggregate by stage with counts
POST   /v1/tasks                    Create task (manual or system)
GET    /v1/tasks?owner=&due=        Task inbox
PATCH  /v1/tasks/{id}/complete      Close task
POST   /v1/leads/{id}/follow-up     Schedule follow-up (creates task)
GET    /v1/sla/breaches             SLA breach report
```

### 4.2 Visit Service — APIs

```
POST   /v1/visits                   Create visit (lead, property, slot, agent)
GET    /v1/visits?date=&agent=      Day plan
PATCH  /v1/visits/{id}/confirm      Customer confirmed
PATCH  /v1/visits/{id}/start        Field check-in
PATCH  /v1/visits/{id}/complete     Outcome + notes
PATCH  /v1/visits/{id}/cancel       Cancel with reason
GET    /v1/availability?agent=&date=
```

### 4.3 Analytics Service — APIs

```
GET    /v1/analytics/funnel?from=&to=
GET    /v1/analytics/source-attribution
GET    /v1/analytics/agent-performance
GET    /v1/analytics/visit-conversion
```

---

## 5. Data Model (additions/changes)

```
Visit
  id, lead_id, property_id, slot_start, slot_end, agent_id,
  status (SCHEDULED|CONFIRMED|IN_PROGRESS|COMPLETED|CANCELLED|NO_SHOW),
  outcome (INTERESTED|NOT_INTERESTED|WANTS_ALTERNATIVE|NEEDS_NEGOTIATION|...),
  notes, created_at, updated_at
Task
  id, lead_id?, visit_id?, owner_id, type, due_at, sla_at,
  status (OPEN|IN_PROGRESS|DONE|SKIPPED), source (SYSTEM|MANUAL),
  result_note, created_at, completed_at
SLAPolicy
  id, stage, max_age_hours, escalation_role
```

Extended Lead state machine — same shape as Phase 1, but **transitions enforced** by CRM Service rules (e.g., cannot move to `VISIT_SCHEDULED` without an active Visit row).

---

## 6. Events

| Event | Producer | New Consumers |
| --- | --- | --- |
| `visit.scheduled` | Visit Service | Notification (confirmation), Analytics |
| `visit.confirmed` | Visit Service | Notification (reminder cadence) |
| `visit.completed` | Visit Service | CRM (auto stage move), Analytics |
| `visit.cancelled` | Visit Service | CRM (re-schedule task), Analytics |
| `task.created` | CRM Service | Notification (assign), Analytics |
| `task.sla_breached` | CRM Service | Notification (escalate), Analytics |
| `lead.inactive` | CRM Service (scheduled) | Next-Best-Action (rule engine) |

---

## 7. Workflows (Temporal)

### 7.1 Visit Lifecycle Workflow
```
schedule → send confirmation → reminder T-24h → reminder T-2h →
   on completion: trigger outcome capture task →
   on no_show: create reschedule task →
   on cancellation: create re-engagement task
```

### 7.2 Lead Nurture Cadence (rule-based NBA)
```
on stage = QUALIFIED + no activity for 48h → create "follow-up call" task
on stage = VISITED + no follow-up in 24h → escalate to lead owner manager
on stage = NEGOTIATION + no movement for 5d → leadership digest
```

These rules live in a versioned config file inside CRM Service. Phase 6 replaces them with an LLM agent.

---

## 8. Notification Templates (WhatsApp Business API)

- Visit confirmation
- Visit reminder (T-24h, T-2h)
- Visit summary thank-you
- Re-engagement nudge

All templates pre-approved with Meta. Notification Service abstracts provider so Gupshup/Twilio is swappable.

---

## 9. Analytics — Day-1 Dashboards

| Dashboard | Audience | Metrics |
| --- | --- | --- |
| Leadership Funnel | CEO / Head of Sales | Lead → Qualified → Visit → Closed counts + conversion rates |
| Source Attribution | Marketing | Leads by source, qualified rate per source |
| Agent Performance | Ops Manager | Visits/agent, completion rate, avg outcome quality |
| SLA Health | Ops Manager | Open tasks, breached SLAs, avg follow-up time |

Data flows: services emit events → event bus → consumer writes to OLAP store (BigQuery / ClickHouse) → dashboards (Metabase / Looker / custom).

---

## 10. Non-Functional Requirements

- Event bus durability: at-least-once delivery; consumer idempotency required
- Workflow engine: tasks resumable across restarts
- Visit reminders delivered within ±5 minutes of scheduled time
- Dashboards refreshed within 5 minutes of source event
- Analytics tolerates 24h backfill window

---

## 11. Dependencies on Phase 1

- Lead Service event stream (`lead.created`, `lead.stage_changed`) stable
- Property Service catalog with at least basic availability flag
- User/Role Service supports `field` role for agent assignment

---

## 12. Deliverables

1. Visit Service deployed
2. CRM Service upgraded with task engine + SLA policies
3. Analytics Service + Day-1 dashboards live
4. WhatsApp Business API integration certified (templates approved)
5. Temporal cluster + event bus operational
6. Runbook updated; SLO targets published per service
7. Staff training: visit scheduling, task inbox, outcome capture

---

## 13. Exit Criteria

- ≥95% of scheduled visits have a recorded outcome within 24h
- ≥80% of qualified leads have an open task at any time during business hours
- Leadership funnel dashboard adopted as the weekly review artifact
- Median follow-up time from enquiry: <4h (was <30min target ack; now full follow-up call)
- SLA breach rate <10% in steady state

---

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Workflow engine learning curve | Start with 2 workflows only; expand after stable |
| WhatsApp template rejection | Submit templates Week 1; have email fallback |
| Agents skip outcome capture | Field-side UX in Phase 4; for now, end-of-day sweep by ops |
| Dashboard misinterpretation | Document each metric definition inline |

---

## 15. Hand-off to Phase 3

By end of Phase 2, the system has clean **funnel data** and **engagement signal**. Phase 3 layers Campaign Service on top of this signal to drive proactive outreach (segmentation needs the data Phase 2 produces).
