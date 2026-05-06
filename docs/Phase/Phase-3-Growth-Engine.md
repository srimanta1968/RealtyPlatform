# Phase 3 — Growth Engine

**Theme:** Replace cold calling with intent-driven outreach
**Duration (target):** 6–8 weeks
**Outcome:** Marketing spend converts into measurable, attributed revenue. Warm leads surface to presales automatically.

---

## 1. Phase Goal

Phase 2 produced clean funnel data. Phase 3 turns that data into **outbound growth**:

- Segment the database by intent, source, behavior, and lifecycle
- Run drip and broadcast campaigns across email, WhatsApp, SMS
- Score lead warmth from engagement signals
- Push warm leads into a **call queue** that presales works first

This is the first phase that introduces **LLM-powered agents** — starting with **Lead Qualification**.

---

## 2. In Scope

- Campaign Service (segmentation, scheduling, send, track)
- Segmentation Engine (rules + saved segments)
- Engagement tracking (opens, clicks, replies)
- Call queue (warm-lead-first inbox)
- **Campaign Scoring Agent** (rule-based + ML scoring)
- **Lead Qualification Agent** (LLM-enabled)
- A/B test framework for campaigns
- Marketing-attribution dashboard

## 3. Out of Scope

- Field mobile app (Phase 4)
- Customer portal (Phase 5)
- Concierge AI (Phase 6)
- Outbound calling automation / dialer (future)

---

## 4. Microservices

| Service | Status | Responsibility |
| --- | --- | --- |
| **Campaign Service** | NEW | Campaign CRUD, scheduling, send orchestration, A/B |
| **Segmentation Engine** | NEW | Rule-based segments, dynamic membership |
| **Engagement Tracker** | NEW | Open/click/reply ingest, attribution |
| **Notification Service** | EXTEND | Bulk send paths, throttling, suppression list |
| **Lead Service** | EXTEND | Score field, warm queue endpoint, qualification metadata |
| **CRM Service** | EXTEND | Call queue UI, dispositions |

### 4.1 Campaign Service — APIs

```
POST   /v1/campaigns                Create draft
PATCH  /v1/campaigns/{id}           Update content / segment / schedule
POST   /v1/campaigns/{id}/test      Send test
POST   /v1/campaigns/{id}/launch    Schedule for send
GET    /v1/campaigns/{id}/metrics   Sends, opens, clicks, replies, conversions
POST   /v1/campaigns/{id}/abort     Halt in-flight
```

### 4.2 Segmentation — APIs

```
POST   /v1/segments                 Define rule (DSL or builder)
GET    /v1/segments/{id}/preview    Sample + size
GET    /v1/segments/{id}/members    Paginated
```

Segment DSL example:
```
location_interest IN ('Lonavala','Karjat')
  AND budget_band >= 2_CR
  AND last_activity_within(30d)
  AND stage NOT IN ('CLOSED','NURTURE')
```

### 4.3 Lead Service — additions

```
GET    /v1/leads/queue/warm         Sorted by score desc, owner-scoped
PATCH  /v1/leads/{id}/qualification Result from agent or human
```

---

## 5. Data Model (additions)

```
Campaign
  id, name, channel (EMAIL|WHATSAPP|SMS), segment_id,
  variants[{id, subject, body_template, send_share}],
  schedule (immediate | cron | one_time),
  status (DRAFT|SCHEDULED|SENDING|SENT|ABORTED),
  attribution_window_days, created_by
Segment
  id, name, dsl, materialized_count, last_refreshed_at
EngagementEvent
  id, lead_id, campaign_id?, channel, type (SEND|DELIVERED|OPEN|CLICK|REPLY|BOUNCE|UNSUB),
  metadata, occurred_at
LeadScore
  lead_id, score, components (json: recency, frequency, intent, fit), updated_at
QualificationResult
  lead_id, source (AGENT|HUMAN), agent_version,
  intent, budget_band, location_interest, urgency, confidence,
  reasoning (text, redactable)
```

---

## 6. Events

| Event | Producer | Consumers |
| --- | --- | --- |
| `campaign.scheduled` / `.launched` / `.completed` | Campaign Service | Analytics |
| `engagement.open` / `.click` / `.reply` | Engagement Tracker | Campaign Scoring Agent, Analytics |
| `lead.scored` | Campaign Scoring Agent | Lead Service (update warm queue), Notification |
| `lead.qualified` | Lead Qualification Agent | CRM (auto stage move), Notification (assign) |
| `lead.unsubscribed` | Engagement Tracker | Notification (suppression list) |

---

## 7. Agents

### 7.1 Campaign Scoring Agent
- **Trigger:** any `engagement.*` event
- **Logic:** rule-based first (recency × frequency × intent), upgrade to gradient-boosted model in late Phase 3
- **Output:** `lead.scored` with components for explainability

### 7.2 Lead Qualification Agent (LLM)
- **Trigger:** `lead.created` + presence of free-text enquiry, **or** any inbound message
- **Logic:** Claude (or equivalent) extracts:
  - Intent (buy / browse / invest)
  - Budget band
  - Location preference
  - Urgency (immediate / 3mo / 6mo+ / unspecified)
  - Confidence per field
- **Guardrails:**
  - Confidence threshold for auto-stage-move; below threshold = human review
  - All outputs versioned; reasoning stored for audit
  - Provider-agnostic SDK (avoid lock-in)

### 7.3 Next-Best-Action — upgrade
- Phase 2 rules continue
- New: warm-queue priority influenced by score
- Phase 3 still **does not** use LLM here; that comes in Phase 6

---

## 8. Workflows

### Drip Campaign
```
on segment match → enroll lead →
  send email D0 → wait 3d → if no engagement, send WA D3 →
  wait 4d → if no engagement, send SMS D7 → exit
on engagement: emit signal, exit drip, increase score
```

### Re-engagement
```
on lead.inactive(60d) AND stage IN ('QUALIFIED','VISITED') →
  enroll in 'reactivation' segment
```

---

## 9. Deliverability & Compliance

- DKIM/SPF/DMARC for email
- WhatsApp opt-in proof captured at lead source
- Suppression list shared across channels
- DPDP-compliant consent capture and revocation
- Per-recipient throttling to protect sender reputation

---

## 10. Non-Functional Requirements

- Bulk send: 50k recipients per campaign without backpressure
- Engagement event ingestion: 1k events/sec sustained
- Score recomputation latency <60s from event
- LLM qualification P95 latency <8s; fallback to async if exceeded
- All agent outputs explainable (components or reasoning shown in UI)

---

## 11. Dependencies on Phase 2

- Clean funnel data and stable lead lifecycle events
- Visit outcomes feed scoring model (visited but not closed = high intent)
- Notification Service abstracts send providers

---

## 12. Deliverables

1. Campaign Service + Segmentation Engine deployed
2. Engagement Tracker with provider webhooks integrated
3. Two agents in production: Campaign Scoring, Lead Qualification (LLM)
4. Warm-lead call queue in CRM cockpit
5. Marketing attribution dashboard
6. A/B test reporting view
7. Compliance & deliverability checks documented and monitored

---

## 13. Exit Criteria

- Cost per qualified lead measurable and trending down month-over-month
- ≥30% of presales daily call volume comes from warm queue (not random)
- Auto-qualification covers ≥60% of inbound leads with confidence ≥0.7
- At least one campaign completes a full attribution cycle to closure
- Open + click rates within industry benchmark; bounce <2%

---

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| LLM hallucination on qualification | Confidence threshold + human review queue + audit log |
| Domain reputation hit from bad list | Warm-up schedule; double opt-in for new segments |
| Over-messaging fatigue | Frequency cap per channel per lead per week |
| Vendor LLM cost spike | Provider-agnostic adapter; per-call cost telemetry |
| Segment DSL complexity | Visual builder for non-technical users |

---

## 15. Hand-off to Phase 4

Phase 3 produces a **scored, segmented, engaged lead base** but field execution is still desktop-driven. Phase 4 puts this intelligence into the field agent's pocket and adds the Property Matching Agent that closes the "Karjat enquiry → Lonavala villa" loop.
