# Phase 7 — Scale & Ownership

**Theme:** From a managed service to a Kiana-owned, hybrid-operated platform — and the blueprint for the next vertical
**Duration (target):** 8–12 weeks (overlapping with steady-state operations)
**Outcome:** Kiana operates day-to-day with confidence; Insignia owns roadmap + AI; the platform is positioned to replicate as a Vertical AI OS.

---

## 1. Phase Goal

Phases 1–6 built the platform. Phase 7 is about **operational maturity** and **strategic optionality**:

- Transition from "Insignia-managed" to "Kiana-operated, Insignia-supported" (hybrid)
- Institutionalize training, governance, and continuous improvement
- Harden the platform for multi-tenancy / multi-region scale
- Extract the **Vertical AI OS** core so it can be replicated (Insurance, Healthcare next)

This phase is less about new features and more about **structural durability**.

---

## 2. In Scope

- Operating model transition (managed → hybrid)
- Training program (role-based)
- Governance forums and KPI cadence
- Platform hardening for scale (multi-region, multi-brand)
- Vertical OS extraction (separation of generic platform from Kiana-specific config)
- SLAs and support tiers
- Customer Success function setup
- Quarterly business review (QBR) operating rhythm

## 3. Out of Scope

- New product features (other than scale-related)
- Net-new vertical builds (planning happens here, build is post-Phase 7)

---

## 4. Workstreams

### 4.1 Operational Transition (Insignia → Kiana)

| Capability | Today (Phase 6) | Phase 7 Target |
| --- | --- | --- |
| Cockpit operations (lead inbox, visits) | Insignia + Kiana co-op | Kiana primary, Insignia escalation |
| Agent ops (review queues) | Insignia | Kiana primary, Insignia weekly audit |
| Campaign execution | Insignia marketing | Kiana marketing with templates |
| Platform engineering | Insignia | Insignia (long-term) |
| Roadmap / product | Insignia | Insignia + Kiana joint |
| AI guardrails / prompts | Insignia | Insignia with Kiana review board |

Transition mechanism: each capability has a **shadow → drive → solo** ramp over 4–8 weeks with explicit checkpoints.

### 4.2 Training Program

| Audience | Module | Format |
| --- | --- | --- |
| Presales | Lead inbox, qualification, warm queue, NBA usage | Live + recorded + checklist |
| Field agents | Field app, voice notes, alternatives | On-site, 1:1 |
| Acquisition | Property intake, intelligence reviews | Workshop |
| Marketing | Segments, campaigns, copy review | Workshop + templates library |
| Ops | Visit scheduling, SLA management, agent ops dashboards | Live + runbooks |
| Leadership | Dashboards, KPI literacy | Briefing + monthly review |

Each module ends with a **competency check** (not a test — a real workflow run).

### 4.3 Governance

| Forum | Cadence | Attendees | Output |
| --- | --- | --- | --- |
| Daily ops standup | Daily | Ops + presales lead | Open SLAs, escalations |
| Weekly performance review | Weekly | Insignia + Kiana leads | KPI trend, anomaly, action |
| Monthly optimization | Monthly | Same + product | Roadmap deltas, A/B results |
| Quarterly business review | Quarterly | Leadership both sides | Strategic decisions, budget, scope |
| Agent review board | Bi-weekly | Insignia AI + Kiana ops | Override patterns, prompt updates |

### 4.4 Platform Hardening

- **Multi-region readiness:** read replicas + region-aware routing for property catalogue and customer portal
- **Multi-brand readiness:** namespace isolation if Kiana adds sub-brands (e.g., "Kiana Premium", "Kiana Land")
- **Capacity planning:** load tests at 5×, 10× current volume; remediation backlog
- **DR drills:** quarterly, with documented recovery
- **Security review:** annual penetration test; remediation tracked
- **Cost optimization:** per-service cost dashboard; quarterly rightsizing

### 4.5 SLAs & Support Tiers

| Tier | Scope | Response | Resolve |
| --- | --- | --- | --- |
| Sev-1 | Capture down, cockpit down, customer-facing portal down | 15 min | 4h |
| Sev-2 | Degraded (slow, partial outage) | 30 min | 8h |
| Sev-3 | Single feature broken, workaround exists | 4h | 3 business days |
| Sev-4 | Cosmetic, enhancement | next sprint | next release |

24×7 on-call for Sev-1 / Sev-2; business hours otherwise.

### 4.6 Customer Success Function

Net-new role(s) at Kiana (with Insignia coaching):

- Activation specialist for portal adoption
- Account engagement reviews for top customers
- Win/loss analysis loop into product

### 4.7 Vertical OS Extraction

Refactor codebase into:

- **Platform Core** — domain-agnostic (event bus, workflow engine, AI gateway, agent runtime, notification, media, document, user/role)
- **Vertical Pack: Real Estate** — Lead/Property/Visit/Campaign domain models, agents, prompts, dashboards
- **Tenant Config: Kiana** — branding, taxonomies, integrations, SLA policies, prompt overrides

This separation enables **Insurance Pack** and **Healthcare Pack** to plug in without forking.

```
┌────────────────────────────────────────┐
│ Tenant Config (Kiana / NextCustomer)   │
├────────────────────────────────────────┤
│ Vertical Pack: Real Estate / Insurance │
├────────────────────────────────────────┤
│ Platform Core (domain-agnostic)        │
└────────────────────────────────────────┘
```

---

## 5. Deliverables

1. Transition plan executed; capability ownership matrix signed off
2. Training program delivered; competency checks passed for all roles
3. Governance forums operating with documented agendas and decisions log
4. Platform hardening: load tests passed at 5× volume; DR drill completed
5. SLA & support framework live; on-call rotations established
6. Customer Success function staffed and producing weekly reports
7. Vertical OS extraction complete; code separation merged; documentation published
8. **Replication playbook** (a public-internal doc describing how to stand up a new vertical pack)

---

## 6. Non-Functional Requirements

- All runbooks current and tested in last 90 days
- Documentation coverage: every service has a one-page operator README
- Mean time to restore (MTTR) Sev-1: <2h
- Change failure rate: <15% (changes that cause incidents)
- Deployment frequency: ≥daily for application services
- Platform Core code coverage of generic vs vertical-specific separation: 100% verifiable

---

## 7. Dependencies on Prior Phases

- Phase 6 agent observability and cost telemetry (required for governance)
- Phase 5 customer portal (required for activation specialist work)
- Phase 4 field app (required for field training)
- Phase 2 SLA policies (extended into formal support tiers)
- Phase 1 audit logs (compliance baseline)

---

## 8. Exit Criteria

- Kiana operates the platform day-to-day for 30 consecutive days without Sev-2+ Insignia escalation on operational tasks
- All governance forums have run for two full cycles with documented outcomes
- Replication playbook validated end-to-end (paper exercise) by an Insignia squad outside the Kiana team
- KPI trend lines positive: lead capture, conversion, cost-per-qualified-lead, sales cycle
- Customer NPS for portal ≥40 and field NPS for app ≥50
- Annual penetration test passed; findings remediated or risk-accepted

---

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Knowledge concentrated in 1–2 Insignia engineers | Pair programming; documentation reviews; rotation |
| Kiana team turnover post-transition | Role-based docs (not person-based); shadow-buddy system |
| Hybrid mode causes accountability ambiguity | RACI matrix per workflow; escalation paths explicit |
| Platform extraction breaks existing flows | Feature flags; staged rollout; regression suite |
| Replication playbook never gets used | Commit to one pilot vertical assessment by end of phase |

---

## 10. Strategic Outcome

By the end of Phase 7, Kiana Realty Growth Platform is no longer a "project" — it is:

1. **A productized real estate operating system** owned by Kiana, supported by Insignia
2. **A reference implementation** of the Insignia Vertical AI OS pattern
3. **A repeatable engine** that turns intent into revenue, with the playbook to replicate into the next vertical

The platform thesis from the original brief is realized:

> Real estate OS → Insurance OS → Healthcare OS

Phase 7 is the bridge that makes that thesis credible to the next customer.
