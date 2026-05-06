# Product Requirements Document (PRD)
## Kiana Realty Growth Platform — A Vertical AI Operating System for Real Estate

**Version:** 1.0
**Owner:** Insignia Consultancy Solutions
**Customer:** Kiana Realty (Rushikesh)
**Status:** Baseline for phased delivery

---

## 1. Vision

> "The website creates trust. The admin cockpit creates revenue discipline."

Kiana Realty Growth Platform is a premium, tech-enabled real estate operating system that:

- Feels effortless and aspirational for buyers
- Is fully measurable and controllable for the business
- Enables lean scaling without heavy upfront hiring
- Evolves into a **semi-autonomous, AI-native revenue engine**

Strategically, this is the first vertical of a broader **AI Operating System** pattern (Real Estate → Insurance → Healthcare) built on Insignia's AppGen platform and AI Control Plane.

---

## 2. Problem Statement

Traditional real estate operations suffer from:

- **Lead leakage** — manual tracking across calls, WhatsApp, spreadsheets
- **Fragmented workflows** — no single source of truth
- **Poor pipeline visibility** — visits, conversions, follow-ups invisible to leadership
- **Heavy human coordination** — every step requires memory and chase
- **Inefficient marketing spend** — cold calling, no attribution, no nurture
- **Lost institutional memory** — when staff leave, history leaves with them

Kiana wants to **avoid the high-headcount brokerage model**, build a **premium brand**, and operate as a **lean, tech-first business**.

---

## 3. Product Goals & KPIs

### Primary Goals
1. Capture and track 100% of inbound leads
2. Convert enquiries into structured workflows
3. Improve visit-to-closure conversion rate
4. Enable lean operations with fewer hires
5. Build long-term business memory as a compounding data asset

### Success Metrics
| KPI | Baseline | Target (12 mo) |
| --- | --- | --- |
| Lead capture rate | ~60% (estimated) | >98% |
| Lead → Visit conversion | ad-hoc | >25% |
| Visit → Closure conversion | ad-hoc | >12% |
| Avg. follow-up time | days | <4 hours |
| Cost per qualified lead | unknown | tracked + decreasing |
| Sales cycle duration | unknown | tracked + decreasing |
| Campaign ROI | not measured | measured per campaign |

---

## 4. Target Users

### External (Customers)
- HNI villa buyers
- Second-home investors
- NRI buyers
- Land investors
- Family home buyers

### Internal
- Presales / Call center
- Admin / Operations
- Field sales executives
- Property acquisition team
- Leadership / Management

---

## 5. First Principles

The product is **not** a website. The product is the **workflow + data + orchestration**:

```
Frontend ≠ Product
Workflows + Data + Orchestration = Product
```

The architecture must therefore be:

- **Event-driven** — every significant action emits an event
- **Agent-orchestrated** — intelligence is a layer on top of events, not embedded in services
- **Microservice-backed** — clear domain boundaries
- **Phase-expandable** — each phase ships standalone value

---

## 6. Core Domains

Everything in the business reduces to **5 core domains**:

1. **Lead** — intent capture and qualification
2. **Property** — inventory, media, publishing
3. **Visit** — scheduling, execution, outcome
4. **Campaign** — segmentation, outreach, attribution
5. **Customer Lifecycle** — closure, documents, post-sale

These map directly to microservices (see §8).

---

## 7. Product Scope

### Core Modules
- Customer Experience Layer (Website, WhatsApp, Landing pages)
- Admin CRM & Operations Cockpit
- Marketing & Campaign Engine
- Field Team Application
- Customer Portal
- AI Intelligence Layer

### Out of Scope (v1)
- Mortgage origination
- Legal document automation beyond storage
- Multi-tenancy for other brokerages (single-tenant Kiana first)
- Title/registration integrations

---

## 8. Architecture Overview

### 8.1 Layered View

```
┌──────────────────────────────────────────────┐
│ Customer Layer:  Website · WhatsApp · Portal │
├──────────────────────────────────────────────┤
│ Agent Layer (AI):                            │
│   Qualification · Matching · Next-Best-Action│
│   Visit Summary · Campaign Scoring · Concierge│
├──────────────────────────────────────────────┤
│ Orchestration:  Event Bus · Workflow Engine  │
├──────────────────────────────────────────────┤
│ Core Services:                               │
│   Lead · Property · CRM · Visit · Campaign   │
│   User · Media · Notification · Analytics    │
├──────────────────────────────────────────────┤
│ Data: OLTP (per-service) · OLAP · Object Store│
└──────────────────────────────────────────────┘
```

### 8.2 Core Microservices

| Service | Responsibility | Phase Introduced |
| --- | --- | --- |
| Lead Service | Capture, state machine, assignment, timeline | 1 |
| Property Service | Inventory, tagging, media refs, publish control | 1 |
| CRM / Workflow Service | Pipeline, tasks, follow-ups, ownership | 1 (lite) → 2 (full) |
| Notification Service | WhatsApp, SMS, Email, Reminders | 1 |
| User / Role Service | Auth, RBAC | 1 |
| Visit Service | Scheduling, assignment, lifecycle, outcome | 2 |
| Analytics Service | Funnel, conversion, attribution | 2 |
| Campaign Service | Segmentation, drip/broadcast, tracking | 3 |
| Media Service | Uploads, transcoding, CDN | 4 (expanded) |
| Field App Backend | Mobile-optimized BFF over CRM + Visit | 4 |
| Customer Portal Service | Saved properties, shortlists, docs | 5 |
| Document Service | Storage, versioning, e-sign hooks | 5 |

### 8.3 Agent Layer (AI)

Agents are **NOT microservices** — they are workflow handlers that subscribe to events and act through the same service APIs a human would use.

| Agent | Trigger Event | Phase |
| --- | --- | --- |
| Lead Qualification | `lead.created` | 3 (LLM) — rule-based earlier |
| Property Matching | `lead.qualified`, `visit.outcome` | 4 |
| Next-Best-Action | `inactivity`, `lead.stage_changed` | 2 (rules) → 6 (LLM) |
| Visit Summary | `visit.completed` | 4 |
| Campaign Scoring | `email.opened`, `link.clicked`, `whatsapp.replied` | 3 |
| AI Concierge | `inbound.chat` | 6 |
| Property Intelligence | scheduled / inventory events | 6 |
| Campaign Copy | `campaign.draft_requested` | 6 |

### 8.4 Orchestration

- **Event Bus:** Kafka / SNS+SQS / GCP PubSub (one choice, decide by Phase 1)
- **Workflow Engine:** Temporal (recommended) for long-running, retryable workflows
- **Schema Registry:** versioned event contracts; backward-compatible evolution

### 8.5 Build Order — Critical Insight

```
Services → Workflows → Agents → Intelligence
```

Building "all microservices first" or "all AI first" both fail. Each phase must ship usable value end-to-end.

---

## 9. Phased Rollout

Detailed design documents per phase live under `docs/Phase/`.

| Phase | Theme | Outcome | Doc |
| --- | --- | --- | --- |
| 1 | Trust Launch | Brand credibility + lead visibility | [Phase-1-Trust-Launch.md](Phase/Phase-1-Trust-Launch.md) |
| 2 | Operations Backbone | Process discipline | [Phase-2-Operations-Backbone.md](Phase/Phase-2-Operations-Backbone.md) |
| 3 | Growth Engine | Better marketing ROI | [Phase-3-Growth-Engine.md](Phase/Phase-3-Growth-Engine.md) |
| 4 | Field Intelligence | Improved field efficiency | [Phase-4-Field-Intelligence.md](Phase/Phase-4-Field-Intelligence.md) |
| 5 | Premium Experience | Better buyer confidence | [Phase-5-Premium-Experience.md](Phase/Phase-5-Premium-Experience.md) |
| 6 | AI Native Layer | Productivity at scale | [Phase-6-AI-Native-Layer.md](Phase/Phase-6-AI-Native-Layer.md) |
| 7 | Scale & Ownership | Sustainable, hybrid operations | [Phase-7-Scale-Ownership.md](Phase/Phase-7-Scale-Ownership.md) |

---

## 10. Cross-Cutting Concerns

### 10.1 Non-Functional Requirements

| Concern | Requirement |
| --- | --- |
| Performance | <2s page load (P75); lead capture acknowledged <500ms |
| Scalability | Multi-region property inventory; 10x lead surge tolerance |
| Availability | 99.9% uptime for capture surfaces; 99.5% for admin |
| Security | RBAC; data encrypted in transit + at rest; PII scoped access |
| Privacy | DPDP Act compliant; consent capture on every channel |
| Data Ownership | All data ownable and exportable by Kiana at any time |
| Observability | Tracing, structured logs, RED metrics on every service |
| Disaster Recovery | RPO ≤ 1h, RTO ≤ 4h |

### 10.2 Security & Access Control

- OAuth2 / OIDC for staff
- Magic link / OTP for customers
- Roles: `admin`, `presales`, `field`, `acquisition`, `leadership`, `customer`
- Field-level redaction on PII for non-owners
- Audit log on all stage transitions

### 10.3 Data Strategy

- **OLTP per service** (Postgres recommended)
- **Event Bus** for inter-service communication
- **Event log → OLAP warehouse** (BigQuery / Snowflake / ClickHouse) for analytics
- **Object store** for media (S3 / GCS) with signed URLs
- **No cross-service DB joins** — strict service boundaries

### 10.4 Integration Points

- WhatsApp Business API (Meta or Gupshup/Twilio)
- Email (SES / Sendgrid)
- SMS (Indian aggregator)
- Maps (Google Maps Platform)
- Calendar (Google Calendar)
- Payment gateway (Razorpay) — Phase 5+
- E-sign (Digio / Leegality) — Phase 5+

---

## 11. Operating Model

### Modes
1. **Fully managed** by Insignia (Phase 1–4)
2. **Hybrid** — Kiana operates day-to-day, Insignia owns roadmap (Phase 5+)
3. **Fully in-house** — Kiana owns end-to-end (future)

### Governance
- Weekly performance review
- Monthly optimization roadmap
- KPI dashboard reviewed by leadership

---

## 12. Risks & Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Low team adoption | Workflow bypass, dirty data | Training + managed ops + UX simplicity |
| Poor data quality | AI agents misfire | Validation at capture; CRM discipline |
| Over-automation early | Customer experience regression | Phased rollout; human-in-the-loop |
| Inventory inconsistency | Buyer trust loss | Admin approval workflows |
| Channel API changes (WhatsApp) | Capture loss | Abstracted notification layer |
| Vendor lock-in (LLM) | Cost / availability risk | Provider-agnostic agent layer |

---

## 13. Dependencies

- Property inventory data (initial seeding)
- Brand assets (logos, photography, copy)
- Sales scripts (qualification, objection handling)
- Lead source integrations (existing forms, ad accounts)
- Team onboarding and training plan

---

## 14. Open Questions

1. Pricing model — retainer vs success fee vs hybrid?
2. AI rollout tolerance — aggressive (Phase 3) vs conservative (Phase 6)?
3. Initial geography priority — Lonavala/Karjat/Alibaug ordering?
4. WhatsApp API provider — Meta direct vs Gupshup/Twilio?
5. CRM — build vs integrate (e.g., LeadSquared) for Phase 1?
6. Data residency — India-only vs global?

---

## 15. Summary

This is **not a product**. It is a **Real Estate Operating System** that:

- Converts **intent into revenue**
- Converts **people-driven process** into **system-driven scale**
- Converts **marketing spend** into a **compounding data asset**

Each phase ships a usable slice. By Phase 6, Kiana operates a semi-autonomous revenue engine that competitors cannot replicate without rebuilding the same data and workflow foundation.
