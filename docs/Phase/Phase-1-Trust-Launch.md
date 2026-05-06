# Phase 1 — Trust Launch

**Theme:** Brand credibility + zero lead leakage
**Duration (target):** 6–8 weeks
**Outcome:** Every website enquiry becomes a trackable lead record. The brand looks premium.

---

## 1. Phase Goal

Establish the foundation: a trust-building public surface and a capture/visibility backbone. **No AI yet.** No clever workflows. Just **capture + visibility + premium feel**.

> Success looks like: a leadership user can see, in one place, every enquiry from the last 24 hours, who owns it, and what stage it is in.

---

## 2. In Scope

- Premium marketing website (location- and lifestyle-led)
- Property browsing (read-only public catalog)
- Lead capture from web forms, WhatsApp click-to-chat, phone enquiry logging
- CRM-lite: lead list, basic stages, ownership, manual notes
- Notification basics: confirmation to customer, alert to presales
- User & RBAC for internal staff

## 3. Out of Scope (deferred)

- Visit scheduling engine (Phase 2)
- Campaign automation (Phase 3)
- Field mobile app (Phase 4)
- Customer portal (Phase 5)
- Any AI / LLM agent (Phase 3+)

---

## 4. Microservices

| Service | Status | Responsibility |
| --- | --- | --- |
| **Lead Service** | NEW | Lead CRUD, simple state machine, assignment, timeline |
| **Property Service** | NEW | Property inventory, media refs, publish flag |
| **CRM Service (lite)** | NEW | Pipeline view over leads; manual stage transitions |
| **Notification Service** | NEW | Email + WhatsApp template send, basic templates |
| **User / Role Service** | NEW | OIDC login, roles, RBAC checks |
| **Web BFF** | NEW | Public website API + admin cockpit API |

### 4.1 Lead Service — APIs

```
POST   /v1/leads                    Create lead (web, WA, manual)
GET    /v1/leads                    List with filters (stage, owner, source)
GET    /v1/leads/{id}               Detail + timeline
PATCH  /v1/leads/{id}/stage         Move stage
PATCH  /v1/leads/{id}/owner         Reassign
POST   /v1/leads/{id}/notes         Append note
GET    /v1/leads/{id}/timeline      Full event history
```

### 4.2 Property Service — APIs

```
POST   /v1/properties               Create (admin)
PATCH  /v1/properties/{id}          Update
PATCH  /v1/properties/{id}/publish  Toggle publish
GET    /v1/properties               Public list (filters: location, type, price)
GET    /v1/properties/{id}          Public detail
```

---

## 5. Data Model (key entities)

```
Lead
  id, source, name, phone, email,
  property_interest_id?, location_interest, budget_band,
  stage (NEW|QUALIFIED|VISIT_SCHEDULED|VISITED|NEGOTIATION|CLOSED|NURTURE),
  owner_id, created_at, updated_at, consent_marketing
LeadTimelineEvent
  id, lead_id, type, payload, actor, at
Property
  id, title, type (LAND|VILLA|RETREAT|...), location, price_min, price_max,
  status (DRAFT|PUBLISHED|HOLD|SOLD), tags[], media[], slug
User
  id, name, email, phone, role, active
```

Lead state machine (Phase 1):

```
NEW → QUALIFIED → VISIT_SCHEDULED → VISITED → NEGOTIATION → CLOSED
                                                          ↘ NURTURE
```

In Phase 1, all transitions are **manual** (admin clicks).

---

## 6. Events

Even though Phase 1 has no agents, we **emit events from day one** so later phases plug in without retrofitting.

| Event | Producer | Consumers (Phase 1) |
| --- | --- | --- |
| `lead.created` | Lead Service | Notification (alert presales), Analytics (later) |
| `lead.stage_changed` | Lead Service | Notification (templated) |
| `lead.assigned` | Lead Service | Notification (notify new owner) |
| `property.published` | Property Service | (none — future SEO/feed consumers) |

**Event envelope** — fixed for all phases:

```json
{
  "event_id": "uuid",
  "event_type": "lead.created",
  "version": "1",
  "occurred_at": "ISO8601",
  "actor": { "type": "user|system", "id": "..." },
  "payload": { ... }
}
```

---

## 7. Customer-Facing Surface

- **Discovery pages:** Lonavala/Khandala, Alibaug, Karjat, Navi Mumbai/Panvel
- **Lifestyle filters:** Villas, Land, Retreats, Investments
- **Property detail:** hi-res images, brochure download, map, CTAs
- **CTAs:** Book consultation · WhatsApp connect · Schedule visit (creates lead, scheduling deferred to Phase 2)
- Page load <2s P75; mobile-first; SEO basics (meta, sitemap, schema.org)

---

## 8. Admin Cockpit (lite)

- Lead inbox: filterable list, kanban view by stage
- Lead detail: timeline, notes, manual stage change, reassign
- Property manager: create/edit/publish
- User manager: invite staff, assign roles

---

## 9. Integrations

| System | Purpose | Phase 1 Choice |
| --- | --- | --- |
| WhatsApp | Click-to-chat + inbound capture | Direct deep link + manual log; **no API yet** |
| Email | Transactional | SES or SendGrid |
| SMS | OTP + alerts | Indian aggregator (MSG91 / Gupshup) |
| Maps | Property location | Google Maps embeds |

> WhatsApp Business API integration is deferred to Phase 2/3 to keep Phase 1 scope tight. Phase 1 uses a "WhatsApp click → opens chat → presales logs lead" flow.

---

## 10. Non-Functional Requirements

- Lead capture P99 latency <500ms
- Public site P75 load <2s
- 99.9% availability for capture endpoints
- All PII encrypted at rest; TLS 1.2+ in transit
- Audit log on every stage change and reassignment
- Daily backup of OLTP databases

---

## 11. Dependencies

- Brand assets (logo, photography, copy)
- Initial property inventory (seed dataset, 20–50 properties)
- Domain + email infrastructure
- Decision: cloud provider (AWS / GCP)
- Decision: event bus tech (defer until Phase 2 if not needed; **but** define event envelope contract now)

---

## 12. Deliverables

1. Public website (responsive, premium)
2. Admin cockpit (lead + property + user management)
3. Six microservices deployed (Lead, Property, CRM-lite, Notification, User, Web BFF)
4. CI/CD pipeline + staging + prod environments
5. Observability baseline (logs, metrics, traces)
6. Runbook + on-call rotation
7. Staff training: presales (lead inbox), admin (property manager)

---

## 13. Exit Criteria

- 100% of website enquiries land as leads (verified by reconciling form submits vs lead count for 7 days)
- Median time from enquiry → first presales touch <30 min during business hours
- Zero lead loss across 14-day soak test
- Leadership dashboard (even if just a lead-count widget) live
- All staff trained; >90% logging into cockpit daily

---

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Brand site overruns scope | Lock design system early; defer custom animations |
| Presales bypasses cockpit (uses WhatsApp directly) | Daily reconciliation report; gamify usage |
| Property data not ready | Acquisition team commitment; minimum 20-property launch threshold |
| Staff resists CRM | Insignia ops co-pilots first 30 days |

---

## 15. Hand-off to Phase 2

By end of Phase 1, the platform must produce a clean **`lead.created` → `lead.stage_changed`** event stream. Phase 2 builds the Visit Service and full CRM workflow on top of these events without modifying Lead or Property services.
