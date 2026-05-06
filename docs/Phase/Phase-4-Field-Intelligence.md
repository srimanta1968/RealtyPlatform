# Phase 4 — Field Intelligence

**Theme:** Put the system in the field agent's pocket — and make every visit smarter than the last
**Duration (target):** 6–8 weeks
**Outcome:** Field agents arrive prepared, capture rich outcomes effortlessly, and present intelligent alternatives on the spot.

---

## 1. Phase Goal

Phases 1–3 built the back office. Phase 4 closes the loop on the **moment of truth** — the site visit:

- Mobile/PWA app for field agents
- Property Matching Agent solves the **"Karjat enquiry → Lonavala villa"** problem
- Visit Summary Agent converts unstructured notes into structured CRM data
- Media Service expanded for property + visit photos/video

This is where the system stops feeling like CRM and starts feeling like an **operating system**.

---

## 2. In Scope

- Field App Backend (BFF over CRM + Visit + Property + Media)
- Mobile/PWA app for field agents (iOS Safari + Android Chrome installable)
- Media Service expansion (uploads, transcoding, CDN, signed URLs)
- **Property Matching Agent** (LLM + embeddings)
- **Visit Summary Agent** (LLM)
- New property intake flow (field-driven acquisition)
- Offline-tolerant capture (queue + sync)

## 3. Out of Scope

- Native iOS/Android apps (PWA is sufficient for v1)
- Customer portal (Phase 5)
- Advanced concierge (Phase 6)

---

## 4. Microservices

| Service | Status | Responsibility |
| --- | --- | --- |
| **Field App Backend** | NEW | Auth, day-plan, lead/property fetch, sync, upload signing |
| **Media Service** | EXTEND | Multipart upload, transcoding, thumbnails, CDN |
| **Property Service** | EXTEND | New property intake (DRAFT pipeline), embeddings |
| **Visit Service** | EXTEND | In-flow notes, voice memo refs, alternative-shown tracking |

### 4.1 Field App Backend — APIs

```
GET    /v1/field/me/day-plan?date=          Today's visits + travel optimized order
GET    /v1/field/visits/{id}                Lead context + property pack + alternatives
POST   /v1/field/visits/{id}/checkin        Geo-stamped check-in
POST   /v1/field/visits/{id}/notes          Append text / voice ref
POST   /v1/field/visits/{id}/media          Signed upload URL + linkage
POST   /v1/field/visits/{id}/outcome        Structured outcome + free text
GET    /v1/field/match?lead_id=             Alternatives from Property Matching Agent
POST   /v1/field/properties/intake          New property captured in field (DRAFT)
POST   /v1/field/sync                       Bulk sync queued offline operations
```

### 4.2 Media Service — APIs

```
POST   /v1/media/upload-url                 Pre-signed URL (constraints: type, size)
POST   /v1/media/finalize                   Notify upload done; trigger transcoding
GET    /v1/media/{id}                       Signed read URL
```

---

## 5. Data Model (additions)

```
Property (additions)
  embedding_vector (pgvector / Pinecone / OpenSearch knn),
  intake_source (ADMIN|FIELD), intake_status (DRAFT|UNDER_REVIEW|PUBLISHED|REJECTED)
VisitMedia
  id, visit_id, type (PHOTO|VIDEO|VOICE), media_id, captured_at, geo, caption
VisitOutcomeStructured
  visit_id, sentiment (POSITIVE|NEUTRAL|NEGATIVE),
  objections[], interest_level (1-5), next_step,
  source (HUMAN|AGENT_EXTRACTED), agent_version
AlternativeShown
  id, visit_id, suggested_property_id, source (AGENT|MANUAL),
  shown (bool), customer_reaction
OfflineSyncOp
  id, agent_id, op_type, payload, client_ts, server_ts, status
```

---

## 6. Events

| Event | Producer | Consumers |
| --- | --- | --- |
| `visit.checked_in` | Field BFF | Notification (alert ops), Analytics |
| `visit.media_uploaded` | Media Service | Visit Summary Agent (when complete), Analytics |
| `visit.outcome_extracted` | Visit Summary Agent | CRM (auto-task), Lead (stage hint) |
| `property.intake_submitted` | Property Service | Notification (acquisition team review queue) |
| `property.indexed` | Property Service | (none — internal to matching agent) |
| `match.suggested` | Property Matching Agent | Field BFF (push), Analytics |

---

## 7. Agents

### 7.1 Property Matching Agent
- **Trigger:** `lead.qualified`, `visit.outcome` (especially "wants_alternative"), `field.match` API call
- **Inputs:** lead intent, budget, location preference, visited property attributes
- **Logic:**
  - Vector search over property embeddings (title + description + tags + location features)
  - Re-rank with rule layer (budget fit, availability, drive-time)
  - Optional LLM re-rank with reasoning ("similar lifestyle, longer drive but more land")
- **Output:** ranked list with `reason` per item

### 7.2 Visit Summary Agent
- **Trigger:** `visit.completed` + (`visit.media_uploaded` of type VOICE) or text notes ≥ N chars
- **Logic:**
  - Transcribe voice memos (Whisper or equivalent)
  - LLM extracts: sentiment, objections, interest level, suggested next step
  - Output writes to `VisitOutcomeStructured` with `source = AGENT_EXTRACTED`
  - Field agent sees draft and confirms (one tap) — confirmation flips source to HUMAN
- **Guardrails:** never auto-close lead based on extraction alone; always human confirmation required for terminal stage moves

---

## 8. Field UX Principles

- **One thumb usable** — every primary action reachable with right thumb on mobile
- **Three-tap rule** — capture an outcome in ≤3 taps + voice memo
- **Offline-first** — full day plan cached at start of day; outcomes queue and sync
- **Map-first navigation** — day plan rendered on map with route optimization
- **Alternatives at the doorstep** — Match button always visible during a visit

---

## 9. Property Acquisition Flow

```
Field agent finds property → Field intake form (photos, geo, owner contact, asking price)
  → submitted as DRAFT
  → acquisition team reviews in admin cockpit
  → enriches details, sets price band + tags
  → publishes (or rejects with reason)
```

This phase formalizes acquisition as a **first-class workflow**.

---

## 10. Non-Functional Requirements

- PWA installable; works on 3G with 10MB initial bundle
- Offline queue tolerates 8h disconnection; conflict resolution last-write-wins with audit
- Photo upload resumable (multipart); compression on-device before upload
- Voice memo: max 5min; transcoded server-side; transcript ready <60s
- Property Matching Agent P95 latency <2s
- Visit Summary Agent end-to-end <5min after visit completion

---

## 11. Dependencies on Prior Phases

- Visit Service (Phase 2) outcome capture extended
- Property Service (Phase 1) data quality good enough for embeddings
- Lead Service (Phase 3) qualified leads with budget/location for matching
- Notification Service templates for acquisition review

---

## 12. Deliverables

1. Field App Backend deployed
2. Mobile/PWA app installed by all field agents
3. Media Service handling property + visit assets at scale
4. Property Matching Agent in production with explainability
5. Visit Summary Agent producing structured outcomes
6. Property acquisition flow live; first 10 field-sourced properties published
7. Field agent training + on-site shadowing for 2 weeks

---

## 13. Exit Criteria

- ≥90% of completed visits have a structured outcome within 1h of completion
- ≥40% of "wants alternative" outcomes converted to a follow-up visit
- Field agent NPS for the app ≥40
- ≥1 alternative property suggested in ≥70% of relevant visits
- Acquisition team processes new field intake within 48h SLA

---

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Field agents don't adopt the app | Co-design sessions; gamified leaderboard; ops shadows first 2 weeks |
| Connectivity in remote sites (Karjat hills) | Aggressive caching + offline queue + map tiles cached |
| Matching agent suggests irrelevant properties | Human override visible; reason shown; feedback loop |
| Voice transcription accuracy on Hindi/Marathi mix | Multilingual model; fallback to text capture |
| Photo storage cost spike | Compression + lifecycle policy (move to cold storage after 90d) |

---

## 15. Hand-off to Phase 5

Field intelligence closed the "moment of truth" loop. Phase 5 closes the **post-visit, pre-closure** loop with a Customer Portal so buyers can shortlist, compare, upload documents, and feel the premium experience the brand promises.
