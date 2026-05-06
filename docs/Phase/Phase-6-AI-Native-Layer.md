# Phase 6 — AI-Native Layer

**Theme:** Productivity at scale — the system anticipates, drafts, and acts
**Duration (target):** 8–10 weeks
**Outcome:** Kiana operates as a semi-autonomous revenue engine. Each presales person handles 3× the lead volume at higher quality.

---

## 1. Phase Goal

Phases 1–5 built the **organism**: services, workflows, data, and human surfaces. Phase 6 layers a **full AI cortex** that reads the organism's signals and acts on them:

- **AI Concierge** answers and qualifies inbound chat 24/7
- **Advanced Lead Scoring** (LLM + ML hybrid) replaces rule-based scoring
- **Property Intelligence Agent** keeps inventory descriptions, pricing hints, and tag quality fresh
- **Campaign Copy Agent** drafts segment-specific outreach
- **Next-Best-Action** upgraded from rules to LLM with full lead context

The bar: every agent is **explainable, overridable, auditable** — and **no agent makes terminal decisions alone**.

---

## 2. In Scope

- AI Concierge (inbound web chat + WhatsApp)
- Advanced Lead Scoring Agent (LLM + ML hybrid)
- Property Intelligence Agent (description quality, tag suggestions, pricing range hints)
- Campaign Copy Agent (subject/body drafts per segment + variant)
- LLM-powered Next-Best-Action with full lead history context
- Agent observability: per-agent dashboards, cost, accuracy, override rate
- Human-in-the-loop review queues for low-confidence outputs

## 3. Out of Scope

- Fully autonomous closure (human always closes)
- Outbound voice AI (future)
- Generative property visualization (future)

---

## 4. Microservices

| Service | Status | Responsibility |
| --- | --- | --- |
| **AI Gateway** | NEW | Unified provider-agnostic LLM access, prompt registry, cost telemetry, caching |
| **Concierge Service** | NEW | Web chat + WhatsApp inbound conversation orchestration |
| **Agent Runtime** | NEW | Hosts agent code (Concierge, NBA, Copy, etc.); event-subscribed |
| **Lead Service** | EXTEND | Score field uses agent output; reasoning surfaced |
| **Property Service** | EXTEND | Accepts agent-suggested edits as DRAFTs requiring approval |
| **Campaign Service** | EXTEND | Accepts agent-drafted copy as DRAFT variants |

### 4.1 AI Gateway — APIs (internal)

```
POST   /v1/ai/complete              { prompt_id, vars, context, route_hint }
POST   /v1/ai/chat                  Multi-turn with state
POST   /v1/ai/embed                 Batch embedding
GET    /v1/ai/prompts/{id}          Versioned prompt template
GET    /v1/ai/usage                 Per-agent cost & latency
```

Provider routing rules per `route_hint`:
- `quality` → top-tier model (Claude / GPT class)
- `latency` → fast small model
- `cost` → cheapest acceptable

### 4.2 Concierge Service — APIs

```
POST   /v1/concierge/sessions                Open new chat
POST   /v1/concierge/sessions/{id}/messages  Append user message
GET    /v1/concierge/sessions/{id}           Transcript
POST   /v1/concierge/sessions/{id}/handoff   Transfer to human (with summary)
```

---

## 5. Data Model (additions)

```
AgentInvocation
  id, agent_name, agent_version, prompt_id, prompt_version,
  input_hash, output, confidence, cost_micro_usd, tokens_in, tokens_out,
  latency_ms, route, occurred_at, related_entity_type, related_entity_id
AgentReviewItem
  id, agent_invocation_id, status (PENDING|APPROVED|REJECTED|EDITED),
  reviewer_id, reviewer_note, reviewed_at
ConciergeSession
  id, customer_phone?, customer_email?, lead_id?,
  channel (WEB|WA), state, opened_at, closed_at, handoff_to_user_id?
LeadInteractionContext (materialized, refreshed on event)
  lead_id, recent_events[], recent_messages[], scoring_components, embeddings
```

---

## 6. Events

| Event | Producer | Consumers |
| --- | --- | --- |
| `concierge.session_opened` | Concierge | Notification (alert if requested), Analytics |
| `concierge.handoff` | Concierge | CRM (assign), Notification (page presales) |
| `agent.invoked` | AI Gateway | Analytics (cost), Observability |
| `agent.suggestion_pending_review` | Agent Runtime | Notification (review queue) |
| `lead.score_updated` | Scoring Agent | Lead Service, Warm queue refresh |
| `property.suggestion_drafted` | Property Intelligence | Acquisition team review queue |
| `campaign.copy_drafted` | Copy Agent | Campaign Service (DRAFT variant) |
| `nba.recommended` | NBA Agent | CRM (task hint), Lead Service (UI hint) |

---

## 7. Agents — Detailed

### 7.1 AI Concierge
- **Channels:** website chat widget, WhatsApp inbound
- **Capability:**
  - Greet, capture intent, ask qualifying questions (budget, location, timeline)
  - Recommend properties from Matching Agent
  - Book consultation slots via Visit Service availability API
  - Hand off to human with full transcript + extracted summary when:
    - explicit human request
    - low confidence
    - high-value buyer signal (budget > threshold, immediate timeline)
- **Guardrails:**
  - Never quote final prices outside of published range
  - Never make commitments on behalf of company
  - Cite property facts only from Property Service
  - Capture consent before storing PII
  - Hard cutoff after N turns without progress → human handoff

### 7.2 Advanced Lead Scoring (hybrid)
- ML model on structured features (recency, frequency, source, fit) **plus** LLM signal extraction from free-text interactions
- Outputs: score 0–100 with explainability components
- Replaces Phase 3 scoring; previous scores retained for backfill comparison

### 7.3 Property Intelligence Agent
- **Trigger:** scheduled nightly + `property.intake_submitted`
- **Capability:**
  - Suggest improvements to descriptions (clarity, premium tone)
  - Suggest tags from current taxonomy
  - Flag stale inventory (no views, no enquiries in 60d)
  - Suggest price band adjustments based on engagement (NOT auto-apply)
- All outputs land as suggestions in acquisition team queue

### 7.4 Campaign Copy Agent
- **Trigger:** marketer requests draft from segment + objective
- **Capability:**
  - Generate subject lines + body for email/WA/SMS
  - Multiple variants for A/B
  - Voice-aligned to brand guidelines (style guide in prompt context)
- Output is always DRAFT; marketer approves before send

### 7.5 LLM Next-Best-Action
- **Trigger:** stage change, inactivity, incoming engagement
- **Capability:** synthesize lead history + recent context + outcome patterns to suggest one specific action with timing and channel
- **Guardrail:** suggestion goes to owner's task inbox, not auto-executed

---

## 8. Human-in-the-Loop Review

Every agent has a confidence threshold and a review queue:

| Agent | Auto-apply threshold | Default reviewer |
| --- | --- | --- |
| Concierge | n/a (live conversation, handoff-on-low-confidence) | Presales |
| Scoring | always auto-applies (low blast radius) | n/a |
| Property Intelligence | never auto-applies | Acquisition lead |
| Campaign Copy | never auto-applies | Marketing lead |
| NBA | never auto-executes; surfaces as task | Lead owner |

---

## 9. Agent Observability

A dedicated **Agent Ops dashboard** tracks:

- Invocations / day per agent
- Cost / day per agent (USD)
- P50 / P95 latency per agent
- Override / rejection rate per agent
- Confidence distribution
- Top failure modes (sampled, reviewed weekly)

Drift detection alerts when override rate > baseline + 3σ.

---

## 10. Prompt & Model Governance

- All prompts versioned in a registry; rollouts gated
- Model upgrades tested against golden set before promotion
- Eval harness with offline regression suite per agent
- Cost guardrails: per-agent monthly budget with alerts
- Provider failover (primary → secondary) on API errors

---

## 11. Non-Functional Requirements

- Concierge response P95 <3s
- NBA suggestion freshness <60s after triggering event
- AI Gateway 99.9% availability (with provider failover)
- Per-tenant cost telemetry granular to agent + invocation
- All agent decisions reversible within 7 days (revert action available)

---

## 12. Dependencies on Prior Phases

- Rich event stream from Phases 1–5
- Embedding index (Phase 4) extended to lead interactions
- Customer Portal (Phase 5) provides additional behavioral signal
- Notification Service (Phases 1–3) handles concierge handoffs

---

## 13. Deliverables

1. AI Gateway in production with cost & prompt registry
2. AI Concierge live on website + WhatsApp
3. Advanced Lead Scoring replacing rule-based scoring
4. Property Intelligence and Campaign Copy review queues operational
5. LLM Next-Best-Action surfacing in CRM cockpit
6. Agent Ops dashboard live; weekly review ritual established
7. Eval harness + golden sets per agent; CI gate before model upgrades

---

## 14. Exit Criteria

- ≥40% of inbound web/WA enquiries fully handled by Concierge (qualified or booked) without human turn-by-turn
- Concierge handoff context rated useful by presales in ≥85% of handoffs
- Advanced scoring outperforms Phase 3 scoring on closure prediction (offline eval)
- Marketer-edit rate on Copy Agent drafts <40% (i.e., drafts mostly usable as-is)
- NBA suggestion acceptance rate ≥50%
- Agent monthly cost within budget; cost-per-qualified-lead trending down

---

## 15. Risks

| Risk | Mitigation |
| --- | --- |
| Concierge gives wrong information | Strict citation to Property Service; never fabricate; handoff on uncertainty |
| LLM cost spike | Per-agent budgets; route_hint cost mode; aggressive caching of static prompts |
| Provider outage | Multi-provider abstraction; degraded mode with rule-based fallbacks |
| Customer feels "talked to by AI" | Transparency about AI; smooth handoff; humans remain primary for HNI |
| Drift in agent quality | Continuous eval; override rate monitoring; weekly review |
| Compliance (PII in prompts) | PII scrubbing layer in AI Gateway; provider DPA reviewed |

---

## 16. Hand-off to Phase 7

By Phase 6 the platform is **AI-native**. Phase 7 productizes the operating model itself — training, governance, hybrid handover from Insignia-managed to Kiana-owned operations, and the playbook for replicating this OS into the next vertical.
