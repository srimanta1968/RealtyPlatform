# Phase 5 — Premium Experience

**Theme:** Make the buyer feel the brand — self-serve confidence between visit and closure
**Duration (target):** 6–8 weeks
**Outcome:** Buyers manage their journey on their own portal; documents and decisions live in one place; closure cycle compresses.

---

## 1. Phase Goal

The brand promise is "premium." Until Phase 5, the buyer experiences premium **only when interacting with humans**. Phase 5 makes the **digital surface** feel premium too:

- Authenticated Customer Portal with saved properties, shortlists, comparison
- Visit history and upcoming visit visibility
- Document upload (KYC, payment proof) + secure download (brochures, agreements)
- E-sign integration (lite)
- Refined Recommendation Agent (better matching from richer signals)

---

## 2. In Scope

- Customer Portal Service (BFF + web app, mobile-responsive)
- Document Service (versioned storage, access control, e-sign hooks)
- Recommendation Agent (refined matching, personalized to portal behavior)
- Communication history view (calls logged, WA threads referenced, emails)
- Payment receipt tracking (token, booking, milestone)
- Notification preferences (channel + frequency)

## 3. Out of Scope

- Concierge AI / chat (Phase 6)
- Full mortgage workflow
- Title/registration automation
- Native mobile customer app (responsive web sufficient for v1)

---

## 4. Microservices

| Service | Status | Responsibility |
| --- | --- | --- |
| **Customer Portal Service** | NEW | Customer-facing BFF, auth, preferences |
| **Document Service** | NEW | Storage, versioning, ACL, e-sign provider integration |
| **Lead Service** | EXTEND | Customer login linkage, preference sync |
| **Property Service** | EXTEND | Customer-visible "shortlist" semantics |
| **Notification Service** | EXTEND | Customer-controlled preferences enforcement |

### 4.1 Customer Portal Service — APIs

```
POST   /v1/portal/auth/request-otp
POST   /v1/portal/auth/verify-otp
GET    /v1/portal/me
GET    /v1/portal/saved                     Saved properties
POST   /v1/portal/saved/{property_id}
DELETE /v1/portal/saved/{property_id}
GET    /v1/portal/shortlist                 Active shortlist
POST   /v1/portal/shortlist/compare         Side-by-side
GET    /v1/portal/visits                    Past + upcoming
GET    /v1/portal/communications            Threaded view
GET    /v1/portal/documents
POST   /v1/portal/documents                 Customer upload (KYC, etc.)
PATCH  /v1/portal/preferences
```

### 4.2 Document Service — APIs

```
POST   /v1/documents                        Upload (server-side)
GET    /v1/documents/{id}                   Signed read URL
POST   /v1/documents/{id}/sign-request      Trigger e-sign envelope
GET    /v1/documents/{id}/audit-trail
PATCH  /v1/documents/{id}/acl               Grant/revoke access
```

---

## 5. Data Model (additions)

```
CustomerAccount
  id, lead_id (1:1 or 1:many over time), email, phone (verified),
  email_verified, created_at, last_login_at
SavedProperty
  customer_id, property_id, saved_at, notes
Shortlist
  customer_id, property_ids[], updated_at
Document
  id, customer_id?, lead_id?, type (KYC|AGREEMENT|PAYMENT|OTHER),
  filename, mime, size, version, parent_id?, uploader (CUSTOMER|STAFF),
  acl[{principal, scope}], esign_envelope_id?, status, created_at
NotificationPreference
  customer_id, channel, opt_in, frequency_cap_per_week
PaymentRecord
  id, lead_id, type (TOKEN|BOOKING|MILESTONE), amount, currency,
  reference, status, evidence_doc_id, recorded_at
```

---

## 6. Events

| Event | Producer | Consumers |
| --- | --- | --- |
| `customer.account_created` | Customer Portal | CRM (link to lead), Analytics |
| `customer.shortlist_updated` | Customer Portal | Recommendation Agent, CRM (signal to owner) |
| `document.uploaded` | Document Service | CRM (task to verify), Notification |
| `document.signed` | Document Service | CRM (advance stage), Notification |
| `payment.recorded` | Payment Module | CRM (stage hint), Notification |
| `customer.preference_changed` | Customer Portal | Notification (apply suppression) |

---

## 7. Recommendation Agent (refined)

Builds on Phase 4 Property Matching Agent with new signal sources:

- **Portal behavior:** views, dwell time, save/unsave, comparison sets
- **Communication signals:** which property was discussed in last call note
- **Stage progression:** what was shortlisted then dropped (negative signal)

Outputs surface in:
- Customer Portal: "You might also like"
- Presales cockpit: "Suggested next conversation"

Same explainability requirement as Phase 4: every suggestion shows reason.

---

## 8. E-sign Integration

- Provider abstraction (Digio / Leegality / DocuSign — picked by region)
- Document → envelope mapping: one document or bundled
- Webhook handler updates `Document.status` and emits `document.signed`
- Audit trail downloadable for compliance

Phase 5 scope: **booking confirmation** and **token receipt** only. Full sale agreements deferred until legal sign-off process is mapped.

---

## 9. Trust & Security

- Customer auth: phone OTP (primary), magic-link email (secondary), passkey (optional)
- Document encryption at rest with per-tenant keys
- Watermark customer-downloaded brochures with their name + timestamp
- ACL audit log on every document access
- Customer can request data export (DPDP compliance)
- Right to erasure workflow

---

## 10. Non-Functional Requirements

- Portal load <2s P75 on mobile 4G
- Document upload up to 100MB, resumable
- E-sign envelope creation <5s P95
- Recommendation refresh <30s after portal interaction
- 99.9% availability for portal auth and document read
- Per-customer rate limit on uploads to prevent abuse

---

## 11. Dependencies on Prior Phases

- Phase 1: Lead Service has phone/email and consent
- Phase 4: Media Service for property images served to portal
- Phase 3: Engagement signals feed Recommendation Agent
- Phase 2: Visit history and outcomes shown in portal

---

## 12. Deliverables

1. Customer Portal (web, mobile-responsive) launched
2. Document Service with e-sign integration (lite)
3. Recommendation Agent v2 (portal-aware)
4. Customer notification preferences UI + enforcement
5. Payment record tracking with evidence linkage
6. Customer onboarding email sequence
7. Compliance review (DPDP, data export, erasure flow)

---

## 13. Exit Criteria

- ≥50% of QUALIFIED-stage leads activate their portal account
- ≥30% of activated customers maintain a shortlist
- Document verification turnaround <24h for ≥90% of uploads
- Token-to-booking cycle time reduced by ≥20% vs Phase 4 baseline
- Customer NPS for portal ≥30 in first month

---

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Low portal adoption | Onboarding email + in-call activation by presales |
| Document leakage / wrong ACL | Default-deny ACL; audit on every access; staff training |
| E-sign provider downtime | Fallback to manual signature workflow; provider-agnostic abstraction |
| Customer support load spike | In-app help; FAQs; escalation to presales owner |
| Recommendation feels "creepy" | Transparency: show why a property is suggested |

---

## 15. Hand-off to Phase 6

By end of Phase 5, the platform owns the **full customer + operations lifecycle**. Phase 6 layers full AI on top — Concierge for inbound, advanced scoring, property intelligence — turning the platform into a **semi-autonomous revenue engine**.
