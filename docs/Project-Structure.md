# Project Structure & Monorepo Design

**Version:** 1.0
**Companion to:** [`PRD.md`](PRD.md) · [`Architecture.html`](Architecture.html)
**Decision:** Monorepo (Turborepo + pnpm workspaces) · Node.js / TypeScript throughout

---

## 1. TL;DR

**One git repository. Many deployable artifacts. Many databases.**

A single monorepo holds every microservice, every agent, every frontend, and every shared package. Each microservice still ships its own Docker image, owns its own PostgreSQL database, and deploys independently — but shared types, SDKs, and the design system live in internal packages that everything consumes via workspace references.

| Concept | Count (by Phase 6) |
| --- | --- |
| Git repositories | **1** |
| Deployable apps (frontends) | **6** |
| BFFs | **3** |
| Microservices | **~14** |
| Agents | **~8** |
| Databases (logical Postgres DBs) | **~12** |
| PostgreSQL clusters (physical) | **1 → 2–3** |
| Shared internal packages | **~10** |

---

## 2. Why Monorepo (vs Polyrepo)

| Concern | Polyrepo | Monorepo (Turborepo) |
| --- | --- | --- |
| Independent deploys | ✅ | ✅ via `--filter=...[origin/main]` |
| Shared event types | npm publish + version drift | `import` from `@kiana/contracts` |
| Cross-service refactor | N PRs, N reviews, N deploys | 1 atomic PR |
| New developer onboarding | Clone N repos | `pnpm install` |
| Phase 7 vertical extraction | Multi-month migration | Folder restructure |
| Repo overhead | N CI configs / READMEs / IaC | One set, configured once |
| Team size to justify | 20+ engineers | Works from 2 engineers |

Polyrepo is the right choice when you have multiple independent teams, mixed tech stacks, or external consumers of one component. **None apply to Kiana.**

---

## 3. Folder Structure

```
realty-platform/                          ← single git repo
│
├── apps/                                 ← user-facing deployables (frontends)
│   ├── web-public/                         Next.js · public marketing site (P1)
│   ├── web-portal/                         Next.js · customer portal (P5)
│   ├── admin-cockpit/                      Vite + React SPA · operators (P1→)
│   ├── field-app/                          React PWA · field agents (P4)
│   ├── marketing-console/                  Vite + React SPA · marketers (P3)
│   └── concierge-widget/                   Embeddable React widget (P6)
│
├── bffs/                                 ← API gateways / aggregators
│   ├── web-bff/                            Public + admin (P1)
│   ├── customer-bff/                       Customer portal (P5)
│   └── field-bff/                          Field PWA (P4)
│
├── services/                             ← microservices, one per bounded context
│   ├── lead-service/                       (P1)
│   ├── property-service/                   (P1) + pgvector (P4)
│   ├── crm-service/                        (P1 → P2)
│   ├── visit-service/                      (P2)
│   ├── notification-service/               (P1 →)
│   ├── user-service/                       (P1)
│   ├── media-service/                      (P1 → P4)
│   ├── analytics-service/                  (P2)
│   ├── campaign-service/                   (P3)
│   ├── segmentation-engine/                (P3)
│   ├── engagement-tracker/                 (P3)
│   ├── document-service/                   (P5)
│   ├── concierge-service/                  (P6)
│   └── ai-gateway/                         (P6)
│
├── agents/                               ← event-subscribed handlers
│   ├── qualification-agent/                (P3)
│   ├── scoring-agent/                      (P3 → upgrade P6)
│   ├── matching-agent/                     (P4)
│   ├── visit-summary-agent/                (P4)
│   ├── recommendation-agent/               (P5)
│   ├── nba-agent/                          (P2 rules → P6 LLM)
│   ├── property-intelligence-agent/        (P6)
│   └── campaign-copy-agent/                (P6)
│
├── workflows/                            ← Temporal workflow definitions
│   ├── visit-lifecycle/                    (P2)
│   ├── drip-campaign/                      (P3)
│   └── lead-nurture/                       (P2)
│
├── packages/                             ← shared internal libraries (NOT deployables)
│   ├── contracts/                          TS types, event schemas, OpenAPI specs
│   ├── sdk/                                Typed client SDK (apps + BFFs)
│   ├── service-client/                     Internal service-to-service client (mTLS, gRPC/HTTP)
│   ├── design-system/                      Tailwind + Radix React components
│   ├── ui-kit/                             React hooks/providers (auth, query, theme)
│   ├── service-kit/                        Fastify base, logging, OTel, auth middleware
│   ├── event-bus/                          Redis Streams / Kafka adapter
│   ├── ai-client/                          AI Gateway client (used by agents)
│   ├── db-kit/                             Drizzle helpers, migrate runner
│   └── config/                             eslint, tsconfig, prettier, jest presets
│
├── db/                                   ← migrations, one folder per service DB
│   ├── lead/migrations/
│   ├── property/migrations/
│   ├── crm/migrations/
│   └── ... (one per service)
│
├── infra/                                ← deployment & infrastructure
│   ├── terraform/                          Cloud resources (RDS, S3, CDN, k8s)
│   ├── helm/                               One chart per service
│   ├── docker/                             Shared base Dockerfiles
│   └── argocd/                             GitOps app definitions
│
├── ops/
│   ├── runbooks/                           One per service
│   ├── dashboards/                         Grafana JSON, Metabase exports
│   └── load-tests/                         k6 scripts
│
├── docs/                                 ← PRD, Architecture, Phase docs
├── scripts/                              ← dev tooling: seed, reset, gen-sdk, gen-types
├── turbo.json                            ← Turborepo pipeline config
├── pnpm-workspace.yaml                   ← workspace definition
├── tsconfig.base.json                    ← shared TypeScript config
├── .github/workflows/                    ← CI pipelines
└── package.json                          ← root manifest
```

---

## 4. Apps Catalog

| App | Framework | Audience | Phase | Deployment |
| --- | --- | --- | --- | --- |
| `web-public` | Next.js 14 (App Router) | Buyers (public) | P1 | Vercel or self-hosted Node |
| `web-portal` | Next.js 14 (App Router) | Authenticated customers | P5 | Vercel or self-hosted Node |
| `admin-cockpit` | Vite + React SPA | Operators (presales, admin) | P1 → | S3 + CloudFront |
| `field-app` | React PWA + Service Worker | Field agents | P4 | S3 + CloudFront, installable |
| `marketing-console` | Vite + React SPA | Marketing team | P3 | S3 + CloudFront |
| `concierge-widget` | React (UMD/ESM bundle) | Embedded on web-public | P6 | S3 + CloudFront, versioned bundle |

### Why two frontend stacks (Next.js + React)

| Surface | SEO/SSR matters? | Data density? | Choice |
| --- | --- | --- | --- |
| `web-public` | Yes (organic discovery) | Low | Next.js |
| `web-portal` | Some (auth gate, but speed matters) | Medium | Next.js |
| `admin-cockpit` | No | Very high | React SPA |
| `field-app` | No (offline-first) | Medium + offline | React PWA |
| `marketing-console` | No | High | React SPA |

Both stacks share the same `@kiana/design-system`, `@kiana/sdk`, and `@kiana/ui-kit`. Developers move between them seamlessly.

---

## 5. BFFs (Backend-for-Frontend)

| BFF | Serves | Why separate |
| --- | --- | --- |
| `web-bff` | `web-public` + `admin-cockpit` | Aggregates calls for web; rate-limits public traffic differently from admin |
| `customer-bff` | `web-portal` | Customer auth context; OTP flow; portal-scoped views |
| `field-bff` | `field-app` | Mobile-optimized payloads; offline sync endpoints; signed-upload helpers |

Each BFF is a thin Fastify service that aggregates downstream microservice calls. They contain **no business logic** — just orchestration, response shaping, and auth.

---

## 6. Microservices Catalog

| Service | Owns | Database | Phase |
| --- | --- | --- | --- |
| `lead-service` | Leads, timeline, scores, qualification metadata | `lead_db` | P1 |
| `property-service` | Properties, media refs, embeddings (pgvector) | `property_db` | P1 |
| `crm-service` | Pipeline, tasks, SLAs, follow-ups | `crm_db` | P1 → P2 |
| `visit-service` | Visits, outcomes, alternatives shown | `visit_db` | P2 |
| `notification-service` | Templates, sends, suppression list, preferences | `notif_db` | P1 |
| `user-service` | Accounts, roles, sessions | `user_db` | P1 |
| `media-service` | Upload metadata, transcoding state | `media_db` | P1 → P4 |
| `analytics-service` | Materialized views, dashboard queries | `analytics_db` + warehouse | P2 |
| `campaign-service` | Campaigns, variants, schedules | `campaign_db` | P3 |
| `segmentation-engine` | Segments, DSL evaluation | (reads from event log) | P3 |
| `engagement-tracker` | Open/click/reply ingest | `engagement_db` | P3 |
| `document-service` | Documents, ACLs, e-sign envelopes | `document_db` | P5 |
| `concierge-service` | Sessions, transcripts, handoffs | `concierge_db` | P6 |
| `ai-gateway` | Prompt registry, invocations, cost telemetry | `ai_db` | P6 |

### Each service folder structure

```
services/lead-service/
├── src/
│   ├── api/              HTTP route handlers (Fastify)
│   ├── domain/           Business logic, state machines
│   ├── infra/            DB repositories, event publishers
│   ├── events/           Event consumers
│   ├── workflows/        Temporal activity definitions (if any)
│   └── server.ts         Fastify bootstrap
├── openapi.yaml          API contract (source of truth)
├── tests/
│   ├── unit/
│   └── integration/      Hits a real Postgres in Docker
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 7. Agents Catalog

Agents are **separately deployed processes**, each subscribed to specific events. They share the `@kiana/ai-client` for AI Gateway access.

| Agent | Triggers | Calls AI Gateway? | Phase |
| --- | --- | --- | --- |
| `qualification-agent` | `lead.created` | Yes (LLM extraction) | P3 |
| `scoring-agent` | `engagement.*` | Yes in P6 (hybrid) | P3 → P6 |
| `matching-agent` | `lead.qualified`, `visit.outcome` | Yes (re-rank) | P4 |
| `visit-summary-agent` | `visit.completed` + media | Yes (Whisper + LLM) | P4 |
| `recommendation-agent` | `customer.shortlist_updated` | Yes | P5 |
| `nba-agent` | Stage change, inactivity | No in P2, Yes in P6 | P2 → P6 |
| `property-intelligence-agent` | Scheduled, `property.intake_submitted` | Yes | P6 |
| `campaign-copy-agent` | `campaign.draft_requested` | Yes | P6 |

### Agent folder structure

```
agents/qualification-agent/
├── src/
│   ├── handler.ts        Event → agent logic
│   ├── prompts/          Versioned prompt files (registered in AI Gateway)
│   ├── extractors/       Output parsing, validation
│   └── server.ts         Event subscription bootstrap
├── tests/
│   ├── golden/           Golden-set evaluations
│   └── unit/
├── Dockerfile
└── package.json
```

---

## 8. Shared Packages

| Package | Purpose | Consumers |
| --- | --- | --- |
| `@kiana/contracts` | Type definitions, event schemas, OpenAPI specs (source of truth) | Services, agents, SDK |
| `@kiana/sdk` | Typed HTTP client + framework bindings | Apps, BFFs |
| `@kiana/service-client` | Internal service-to-service client (mTLS, retries, circuit breaker) | Services, agents |
| `@kiana/design-system` | Tailwind + Radix React components | All frontend apps |
| `@kiana/ui-kit` | React hooks/providers (auth, query, theme, telemetry) | All frontend apps |
| `@kiana/service-kit` | Fastify base, logging, OTel, auth middleware, health checks | Services, BFFs |
| `@kiana/event-bus` | Redis Streams / Kafka adapter with at-least-once + idempotency helpers | Services, agents |
| `@kiana/ai-client` | AI Gateway client SDK (route hints, cost telemetry, retry) | Agents |
| `@kiana/db-kit` | Drizzle helpers, migration runner, transaction patterns | Services |
| `@kiana/config` | Shared eslint, tsconfig, prettier, jest presets | All packages |

### Dependency rules (enforced by ESLint)

```
apps/*    → packages/sdk, packages/design-system, packages/ui-kit, packages/contracts
bffs/*    → packages/sdk, packages/service-client, packages/service-kit, packages/contracts
services/* → packages/service-kit, packages/service-client, packages/event-bus,
            packages/db-kit, packages/contracts
agents/*  → packages/event-bus, packages/ai-client, packages/service-client, packages/contracts

❌ services/* MUST NOT import from packages/sdk
❌ services/* MUST NOT import from another services/*
❌ apps/* MUST NOT import from services/* directly
```

These are enforced by `eslint-plugin-boundaries` and fail CI on violation.

---

## 9. SDK — Deep Dive

`@kiana/sdk` is the typed client every frontend uses. It's the contract enforcement layer between services and clients.

### 9.1 Module structure

```
packages/sdk/
├── src/
│   ├── clients/                        ← per-service clients
│   │   ├── lead/
│   │   │   ├── generated/              auto-generated from OpenAPI
│   │   │   ├── client.ts               hand-written wrapper
│   │   │   ├── types.ts                re-exports + brand types
│   │   │   └── index.ts
│   │   ├── property/
│   │   ├── crm/
│   │   ├── visit/
│   │   ├── campaign/
│   │   ├── notification/
│   │   ├── media/
│   │   ├── document/
│   │   ├── user/
│   │   ├── analytics/
│   │   ├── portal/
│   │   ├── concierge/
│   │   ├── ai-gateway/
│   │   └── field/
│   │
│   ├── core/                           ← hand-written infrastructure
│   │   ├── http-client.ts              fetch wrapper, timeouts, interceptors
│   │   ├── auth.ts                     token storage, refresh, OIDC + OTP
│   │   ├── errors.ts                   ValidationError, NotFoundError, ConflictError, RateLimitedError
│   │   ├── retry.ts                    exponential backoff, idempotency keys
│   │   ├── telemetry.ts                W3C trace headers, OTel propagation
│   │   ├── pagination.ts               cursor + offset async iterators
│   │   ├── filters.ts                  type-safe filter builders
│   │   └── config.ts                   env-aware base URLs, feature flags
│   │
│   ├── react/                          ← React bindings (TanStack Query)
│   │   ├── provider.tsx                <KianaSDKProvider />
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useLead.ts
│   │   │   ├── useLeadList.ts
│   │   │   ├── useLeadMutation.ts
│   │   │   ├── useProperty.ts
│   │   │   ├── useVisit.ts
│   │   │   ├── useTaskInbox.ts
│   │   │   ├── useWarmQueue.ts
│   │   │   ├── useCampaign.ts
│   │   │   ├── useSegment.ts
│   │   │   ├── useDocument.ts
│   │   │   ├── useShortlist.ts
│   │   │   └── ...
│   │   └── realtime/
│   │       ├── useLeadStream.ts        SSE/WebSocket subscription
│   │       └── useTaskStream.ts
│   │
│   ├── next/                           ← Next.js Server bindings
│   │   ├── server-client.ts            Server-side client with cookie auth
│   │   ├── server-actions.ts           Type-safe Server Action helpers
│   │   ├── middleware.ts               Auth middleware
│   │   └── revalidate.ts               ISR revalidation helpers
│   │
│   ├── upload/                         ← file upload helpers
│   │   ├── signed-url.ts
│   │   ├── multipart.ts
│   │   ├── resumable.ts                resumable upload for field PWA
│   │   └── compress.ts                 client-side image compression
│   │
│   ├── concierge/                      ← chat-specific helpers
│   │   ├── chat-stream.ts              streaming token consumer
│   │   └── handoff.ts                  trigger handoff with summary
│   │
│   ├── sync/                           ← offline-first helpers (Field PWA)
│   │   ├── offline-queue.ts            IndexedDB op queue
│   │   └── conflict-resolver.ts        last-write-wins + audit
│   │
│   ├── embeddings/
│   │   └── property-search.ts          vector search wrapper
│   │
│   ├── types/                          ← re-exports from @kiana/contracts
│   │   ├── index.ts
│   │   ├── events.ts
│   │   ├── enums.ts
│   │   └── primitives.ts               branded types (LeadId, PropertyId, ...)
│   │
│   └── index.ts                        ← main entry point
│
├── codegen/                            ← OpenAPI codegen config
│   ├── openapi-generator.config.ts
│   └── post-generate.ts                custom transforms
│
├── tests/
│   ├── unit/
│   ├── contract/                       contract tests against mock server
│   └── integration/                    against real services in Docker
│
├── tsup.config.ts                      build config (dual ESM/CJS)
├── package.json
└── README.md
```

### 9.2 What's auto-generated vs hand-written

```
80% auto-generated:
  ✓ HTTP request/response shapes
  ✓ DTO types
  ✓ Endpoint method signatures
  ✓ Enum values
  ✓ Error response types

20% hand-written:
  ✓ React Query keys + invalidation logic
  ✓ Optimistic update helpers
  ✓ Cross-service helpers (e.g., leads.scheduleVisit() wraps Visit Service call)
  ✓ Typed error classes (instead of generic HTTP errors)
  ✓ Pagination iterators
  ✓ Realtime subscriptions (SSE/WebSocket)
  ✓ Upload orchestration
  ✓ Offline queue / sync helpers
```

### 9.3 SDK Generation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Service author edits services/lead-service/openapi.yaml       │
│    (or it's generated from Fastify route schemas via fastify-swagger)│
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ pnpm changeset / git commit
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CI detects change to openapi.yaml (Turborepo affected)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. pnpm run gen:sdk --filter=lead                                │
│                                                                  │
│    a. Validates openapi.yaml (spectral lint)                     │
│    b. Runs hey-api / openapi-typescript                          │
│    c. Outputs to packages/sdk/src/clients/lead/generated/        │
│    d. Runs post-generate.ts (formatting, brand types)            │
│    e. Updates packages/contracts/src/services/lead.ts            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Hand-written wrapper at clients/lead/client.ts re-exports     │
│    generated types + adds custom logic                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. SDK builds (tsup) → dist/ with ESM + CJS + .d.ts              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Apps that depend on SDK rebuild (Turborepo cascade)           │
│    TypeScript compiler catches breaking changes immediately      │
└─────────────────────────────────────────────────────────────────┘
```

### 9.4 Codegen tooling

| Tool | Purpose |
| --- | --- |
| **`fastify-swagger`** | Inside each service, generates `openapi.yaml` from Fastify route schemas (Zod-based) |
| **`@hey-api/openapi-ts`** (or `openapi-typescript-codegen`) | Generates TypeScript clients from OpenAPI |
| **`@stoplight/spectral`** | Lints OpenAPI specs (consistency, breaking change detection) |
| **`@apidevtools/swagger-cli`** | Bundles multi-file OpenAPI specs |
| **`tsup`** | Builds the SDK package (ESM + CJS + .d.ts, fast) |
| **`changesets`** | Versioning and changelog generation |

### 9.5 Build configuration

```
// packages/sdk/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index:     'src/index.ts',
    react:     'src/react/index.ts',
    next:      'src/next/index.ts',
    upload:    'src/upload/index.ts',
    sync:      'src/sync/index.ts',
    concierge: 'src/concierge/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  external: ['react', 'react-dom', 'next', '@tanstack/react-query'],
  clean: true,
})
```

This produces multiple entry points, so consumers can:

```ts
// Tree-shakable imports
import { LeadClient } from '@kiana/sdk'                  // core
import { useLead, useLeadList } from '@kiana/sdk/react'  // React hooks
import { getServerClient } from '@kiana/sdk/next'        // Next.js server
import { uploadResumable } from '@kiana/sdk/upload'      // upload helper
```

The Customer Portal pulls only `@kiana/sdk` + `@kiana/sdk/react` + `@kiana/sdk/next` and tree-shaking strips the field-app-specific upload/sync helpers.

### 9.6 Versioning & publishing

| Aspect | Strategy |
| --- | --- |
| **Versioning** | Single SDK version, semver. Breaking changes bump major. |
| **Source of truth** | `packages/sdk/CHANGELOG.md` (managed by Changesets) |
| **Publishing** | **Workspace-only** — never published to public npm. Apps reference `"@kiana/sdk": "workspace:*"`. |
| **Internal registry** | Optional Verdaccio for downstream tools that need built artifacts |
| **Breaking change detection** | Spectral rules + API extractor diff in CI |
| **Distribution** | Via monorepo workspace symlinks. Each app build resolves the current source. |

### 9.7 Testing the SDK

```
packages/sdk/tests/
├── unit/                  ← hooks, helpers, error mapping
│   ├── retry.test.ts
│   ├── pagination.test.ts
│   └── auth.test.ts
├── contract/              ← against mock server (Prism / MSW)
│   ├── lead.test.ts       ← every endpoint, every error path
│   ├── property.test.ts
│   └── ...
└── integration/           ← against real services in Docker
    └── e2e-lead-flow.test.ts
```

Contract tests guarantee the SDK matches what the service actually exposes — they run against a mock generated from the same `openapi.yaml`. When a service author changes the OpenAPI in a breaking way, the contract test fails and CI blocks the merge.

### 9.8 Single-package vs multi-package decision

**Phase 1–3:** Single `@kiana/sdk` package with multiple entry points (above). Simpler.

**Phase 4+:** If Field PWA bundle exceeds 500KB or Concierge widget needs minimal payload, split into:

```
@kiana/sdk-core         http-client, auth, errors, telemetry
@kiana/sdk-lead         lead client + types
@kiana/sdk-property
@kiana/sdk-crm
@kiana/sdk-visit
@kiana/sdk-campaign
@kiana/sdk-portal
@kiana/sdk-field
@kiana/sdk-react        React hooks, providers
@kiana/sdk-next         Next.js helpers
@kiana/sdk-upload       File upload helpers
```

The split is mechanical because the per-service folder structure already separates concerns.

---

## 10. Contracts Package — Source of Truth

`@kiana/contracts` is upstream of everything. Pure types, no runtime.

```
packages/contracts/
├── src/
│   ├── services/                     ← per-service DTOs
│   │   ├── lead.ts
│   │   ├── property.ts
│   │   ├── crm.ts
│   │   └── ...
│   ├── events/                       ← event payload types
│   │   ├── lead-events.ts            LeadCreated, LeadQualified, ...
│   │   ├── visit-events.ts
│   │   ├── campaign-events.ts
│   │   └── envelope.ts               EventEnvelope<T>
│   ├── enums/                        ← shared enums
│   │   ├── stages.ts                 LeadStage, VisitStatus, ...
│   │   ├── channels.ts               EMAIL | WHATSAPP | SMS
│   │   └── roles.ts
│   ├── primitives/                   ← branded types
│   │   ├── ids.ts                    LeadId, PropertyId, UserId
│   │   └── money.ts                  Money, Currency
│   ├── schemas/                      ← Zod schemas (runtime validation)
│   │   ├── lead.schema.ts
│   │   └── ...
│   └── index.ts
├── openapi/                          ← per-service OpenAPI specs
│   ├── lead.openapi.yaml
│   ├── property.openapi.yaml
│   └── ...
├── asyncapi/                         ← event bus contracts (AsyncAPI 2.x)
│   └── events.asyncapi.yaml
└── package.json
```

| Use case | Imports from contracts |
| --- | --- |
| Service validating request body | `LeadCreateSchema` (Zod) |
| Agent typing event payload | `LeadCreated` (TS type) |
| SDK auto-gen reading API shape | `openapi/lead.openapi.yaml` |
| Frontend typing form values | `LeadDraft` (TS type) |

---

## 11. Database Strategy

### 11.1 Logical isolation, physical consolidation

| Aspect | Strategy |
| --- | --- |
| **Logical DBs** | One per service (`lead_db`, `property_db`, ...) |
| **Physical clusters (P1–P3)** | One managed Postgres cluster, ~10 logical DBs |
| **Physical clusters (P4–P5)** | Same + read replica for analytics |
| **Physical clusters (P6+)** | Optionally split heavy services to dedicated clusters |
| **Cross-service joins** | **Forbidden.** Use APIs or events. |
| **Migrations** | Per service, in `db/<service>/migrations/`, run as k8s pre-deploy Job |

### 11.2 Migration tooling

- **Drizzle** (recommended) or Prisma — pick one and stick with it
- Each service owns its `db/<service>/schema.ts` and `migrations/`
- Migrations follow expand–contract pattern (backward-compatible deploy → code switch → drop old)
- A new service is created by running `pnpm scaffold:service <name>` which seeds the DB folder, schema, and migration runner

### 11.3 Splitting later

```
Before: 1 cluster, 10 DBs
After:  3 clusters
  ├── core-cluster: lead_db, property_db, crm_db (highest traffic)
  ├── ops-cluster:  visit_db, notif_db, user_db, media_db
  └── ai-cluster:   ai_db, concierge_db, analytics_db
```

The split is just: pg_dump → restore → update connection string. **No code changes** because services never knew their DBs were on the same cluster.

---

## 12. Deployment Topology

```
┌─────────────────────────────────────────────────────────────────┐
│ CDN (CloudFront / Cloudflare) + WAF                             │
│   ├── apps/web-public          → Vercel / Next runtime          │
│   ├── apps/web-portal          → Vercel / Next runtime          │
│   ├── apps/admin-cockpit       → S3 + CDN                       │
│   ├── apps/field-app           → S3 + CDN + service worker      │
│   ├── apps/marketing-console   → S3 + CDN                       │
│   └── apps/concierge-widget    → S3 + CDN (versioned bundle)    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Gateway (Kong / Traefik / ALB)                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Kubernetes Cluster                                              │
│   ├── bffs/*           (3 deployments, 2 replicas each)         │
│   ├── services/*       (~14 deployments, HPA on RPS)            │
│   ├── agents/*         (~8 deployments, HPA on queue depth)     │
│   └── workflows/*      (Temporal worker pool)                   │
└──────┬──────────────────┬──────────────────┬───────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌────────────┐   ┌─────────────────┐   ┌──────────────────┐
│ Postgres   │   │ Redis           │   │ Object Store     │
│ Cluster    │   │ (cache + bus)   │   │ (S3, media, docs)│
│ ~12 DBs    │   └─────────────────┘   └──────────────────┘
└────────────┘
```

### Per-service deployment artifact

```
infra/helm/lead-service/
├── Chart.yaml
├── values.yaml                     defaults
├── values.staging.yaml             staging overrides
├── values.production.yaml          production overrides
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── hpa.yaml                    horizontal pod autoscaler
    ├── pdb.yaml                    pod disruption budget
    ├── servicemonitor.yaml         Prometheus scrape
    ├── pre-deploy-job.yaml         runs DB migration before rollout
    └── networkpolicy.yaml          restrict who can talk to this service
```

---

## 13. CI/CD Pipeline

### 13.1 Turborepo `affected` detection

```yaml
# .github/workflows/ci.yml (excerpt)
- name: Determine affected
  run: pnpm turbo run build test lint --filter=...[origin/main]
```

Only packages whose source (or transitive dependency) changed are built and tested. Average PR runs 3–5 packages instead of 30+.

### 13.2 Pipeline stages

```
PR open
  ├── Lint (eslint, spectral on openapi)
  ├── Typecheck (affected packages)
  ├── Build (affected packages)
  ├── Unit tests (affected packages)
  ├── Contract tests (SDK against mock server)
  ├── Integration tests (services against real Postgres)
  └── Bundle size check (apps)

merge to main
  ├── Build Docker images for affected services
  ├── Push to registry, tag with commit SHA
  ├── Update Helm values in infra/argocd/
  └── Argo CD detects values change → rolls out

production tag
  ├── Promote staging image to production
  └── Run DB migrations as pre-deploy Job
```

### 13.3 Caching

Turborepo's remote cache (Vercel-hosted or self-hosted with Turborepo Remote Cache server) means second CI runs of the same code are seconds, not minutes.

---

## 14. Scalability Path

The structure above scales without restructuring. What changes per stage:

| Stage | Lead/day | What changes |
| --- | --- | --- |
| **MVP (P1)** | <100 | Single Postgres, single Redis, one k8s cluster, 3 nodes |
| **Growth (P3)** | 100–1k | Add read replicas, scale services horizontally, add Kafka if Redis Streams strain |
| **Scale (P5)** | 1k–10k | Split hot DBs (Lead, Property) to dedicated clusters; add caching layer |
| **AI-scale (P6)** | 10k+ | AI Gateway becomes bottleneck — aggressive caching, semantic dedup, route_hint=cost |
| **Multi-region (P7)** | any | DR region with read replicas; CDN already global |

None of these require restructuring the repo.

---

## 15. Phase 7 — Vertical OS Extraction

The only meaningful restructure, and it's a folder move (not a rewrite):

```
Before P7:                            After P7:
realty-platform/                      insignia-platform/
├── apps/                             ├── platform-core/         ← Layer 1 (generic)
├── services/                         │   ├── services/
├── agents/                           │   │   ├── notification/
├── packages/                         │   │   ├── media/
                                      │   │   ├── document/
                                      │   │   ├── user/
                                      │   │   └── ai-gateway/
                                      │   └── packages/
                                      │       ├── service-kit/
                                      │       ├── event-bus/
                                      │       └── design-system/
                                      ├── verticals/
                                      │   └── real-estate/       ← Layer 2 (domain)
                                      │       ├── services/
                                      │       │   ├── lead/
                                      │       │   ├── property/
                                      │       │   ├── crm/
                                      │       │   ├── visit/
                                      │       │   └── campaign/
                                      │       ├── agents/
                                      │       └── apps/
                                      └── tenants/
                                          └── kiana/             ← Layer 3 (config)
                                              ├── branding/
                                              ├── prompts/
                                              └── integrations/
```

Because everything is in one monorepo with internal package references, this is automatable. Adding Insurance becomes `verticals/insurance/`.

---

## 16. Tech Stack Decisions

| Concern | Recommendation | Why |
| --- | --- | --- |
| **Monorepo tool** | Turborepo + pnpm workspaces | Fastest, simplest, best caching |
| **Service framework** | Fastify | Lighter than NestJS, faster, plugin ecosystem |
| **ORM / migrations** | Drizzle | SQL-first, lightweight, generates TS types from schema |
| **API style** | OpenAPI 3.1 (REST) | Tooling maturity; gRPC for service-to-service later |
| **Validation** | Zod (shared with Fastify route schemas) | One source of truth for runtime + types |
| **Event bus (P1–P3)** | Redis Streams | Cheap, simple, sufficient for early phases |
| **Event bus (P3+)** | Kafka | When consumer count or throughput demands it |
| **Workflow engine** | Temporal | Durable, inspectable, retryable |
| **AI provider** | Provider-agnostic via AI Gateway | Avoid lock-in, central cost telemetry |
| **Frontend SSR** | Next.js 14 App Router | RSC + Server Actions reduce client JS |
| **Frontend SPA** | Vite + React 18 | Fast dev loop, TanStack Query for server state |
| **Mobile** | React PWA (no native) | One codebase, installable, sufficient through P6 |
| **Testing** | Vitest (unit) · Playwright (e2e) · Testcontainers (integration) | Modern, fast, good DX |
| **CI/CD** | GitHub Actions + Argo CD | GitHub-native + GitOps for k8s |
| **Compute** | Kubernetes (managed: EKS / GKE) | Scales long-term; ECS faster to start if k8s feels heavy |
| **Observability** | OpenTelemetry → Grafana stack or Datadog | Vendor-agnostic instrumentation |

---

## 17. Decisions: Now vs Defer

| Decide now | Defer |
| --- | --- |
| ✅ Monorepo (Turborepo + pnpm) | ❌ Kafka vs Redis Streams (start Redis, decide P3) |
| ✅ Folder layout above | ❌ Vercel vs self-hosted Next.js (start Vercel) |
| ✅ One Postgres cluster, DB-per-service | ❌ Single vs multi-region (P7 concern) |
| ✅ Node.js + TypeScript + Fastify | ❌ Specific LLM provider |
| ✅ Drizzle ORM | ❌ Service mesh (not needed until P5+) |
| ✅ OpenAPI-first → generated SDK | ❌ Separate clusters per environment (use namespaces first) |
| ✅ Feature-flag tooling | ❌ Splitting SDK into multiple packages (defer until P4) |

---

## 18. Open Questions to Confirm

1. **Cloud provider** — AWS, GCP, or Azure? (Affects Terraform, managed services.)
2. **Next.js hosting** — Vercel or self-hosted in Kubernetes?
3. **ORM** — Drizzle or Prisma?
4. **Service framework** — Fastify or NestJS?
5. **Repo location** — GitHub, GitLab, or Bitbucket?
6. **Compute** — Kubernetes from day one, or start on simpler (Fly.io / Render / ECS) and migrate?

Once answered, the scaffolding (`pnpm-workspace.yaml`, `turbo.json`, app/service skeletons, Dockerfiles, Helm charts, GitHub Actions workflows) can be generated.
