# StadiumFlow — 2026 World Cup Transit Management System

> **Project codename**: FIFA Transit App / StadiumFlow  
> **Stack**: Next.js 16 (App Router), React 19, TypeScript, MongoDB, NextAuth v4  
> **Status**: Active development — demo / hackathon build  
> **Deploy target**: Vercel + MongoDB Atlas  

---

## 1. What This Is

A unified digital control system for **2026 FIFA World Cup** stadium operations, fan engagement, and real-time transit management. Two portals in one codebase:

| Portal | Audience | Key Features |
|--------|----------|--------------|
| **Fan Hub** | Ticket holders | Live match scoreboard, crowd telemetry, AI copilot chat (FanAssist), personalized egress plans, crowd-opt-in detection |
| **Staff Hub** | Stadium staff / security / ops | Congestion heatmaps (3 visual modes), live gate alerts, enforcement panel, operational insights, admin logs |
| **Admin Console** | Admins | Staff approval queue, user management, developer settings (feature flags, match API config) |

---

## 2. Architecture Overview

```
src/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Admin route group (protected)
│   │   ├── dashboard/            # Admin dashboard
│   │   ├── manage-staff/         # Staff approval queue
│   │   ├── settings/             # Developer settings
│   │   └── users/                # User management table
│   ├── (auth)/                   # Auth route group
│   │   ├── login/                # Sign-in page
│   │   └── signup/               # Staff registration page
│   ├── api/
│   │   ├── admin/                # Admin-only endpoints
│   │   │   ├── settings/         # Feature flags + match API config
│   │   │   ├── staff/[id]/approve|reject/
│   │   │   ├── stats/            # Admin stats
│   │   │   └── users/            # User list with search
│   │   ├── auth/                 # NextAuth + registration
│   │   ├── chat/                 # AI copilot streaming
│   │   ├── config/               # Public runtime config
│   │   ├── fan/queries/          # Fan query logging + streaming
│   │   ├── health/               # Health check
│   │   ├── match/                # Football-data.org / API-Football proxy
│   │   ├── og/                   # Dynamic OG image generation
│   │   ├── staff/                # Staff metrics, registration, status
│   │   ├── telemetry/            # Live stadium telemetry
│   │   └── track/                # Position event ingestion + egress planning
│   │       ├── consent/          # Crowd detection consent
│   │       ├── crowd/            # Nearby crowd count
│   │       ├── event/            # Position event ingestion
│   │       ├── nearby/           # Nearby users
│   │       ├── plan/             # Per-user egress plan (GET/POST)
│   │       ├── setup/            # One-tap setup
│   │       ├── staff/            # Staff position events
│   │       ├── stream/           # SSE for live updates
│   │       └── summary/          # Crowd summary
│   ├── staff/                    # Staff portal pages
│   │   ├── page.tsx              # Staff Hub
│   │   └── register/             # Staff registration
│   ├── globals.css               # Tailwind v4 + design tokens
│   ├── layout.tsx                # Root layout + providers
│   └── page.tsx                  # Landing / Fan Hub entry
├── components/
│   ├── admin/                    # Admin-only components
│   ├── auth/                     # Auth UI (Google OneTap, forms, guards)
│   ├── heatmap/                  # 3 heatmap visualizations
│   ├── match/                    # Scoreboard, schedule
│   ├── ui/                       # shadcn-style primitives (button, card, badge, tabs, input, scroll-area, separator, modal)
│   ├── AICopilotChat.tsx         # Streaming AI chat (FanAssist)
│   ├── ConnectionGuard.tsx       # Online/offline banner
│   ├── DemoController.tsx        # Demo mode state + data
│   ├── EgressPlanCard.tsx        # Personalized egress plan display
│   ├── EnforcementPanel.tsx      # Staff enforcement actions
│   ├── FanHub.tsx                # Fan portal composition
│   ├── GateAlertsPanel.tsx       # Live gate alerts
│   ├── GuidedWalkthrough.tsx     # Onboarding tour
│   ├── HeatmapSelector.tsx       # Heatmap variant picker
│   ├── LiveQueryTicker.tsx       # Streaming fan queries
│   ├── LiveStatusCards.tsx       # Telemetry cards
│   ├── MatchScoreboard.tsx       # Live match card
│   ├── MatchSchedule.tsx         # Fixture list
│   ├── OperationalInsights.tsx   # Staff insights panel
│   ├── ProtectedRoute.tsx        # Role-based route guard
│   ├── StaffHub.tsx              # Staff portal composition
│   ├── StadiumBackground.tsx     # Animated stadium BG
│   ├── StadiumSVG.tsx            # SVG stadium heatmap
│   ├── ThermalGrid.tsx           # Thermal grid heatmap
│   ├── StadiumMap.tsx            # Map-based heatmap
│   └── TransitDashboard.tsx      # Transit overview
├── hooks/
│   ├── useChatStream.ts          # SSE chat streaming
│   ├── useCrowdDetection.ts      # Geofence consent + nearby
│   ├── useEgressPlan.ts          # SSE egress plan updates
│   ├── useMatchData.ts           # Match polling + demo data
│   ├── useOneTap.ts              # Google OneTap flow
│   ├── useOnlineStatus.ts        # Navigator.onLine + ping
│   └── useStaffStatus.ts         # Staff role/status checks
├── lib/
│   ├── auth/                     # Auth utilities
│   │   ├── auth.ts               # NextAuth options (Google, Credentials, OneTap)
│   │   ├── session.ts            # Server session helper
│   │   ├── users.ts              # User CRUD + indexes
│   │   └── utils.ts              # Role helpers
│   ├── crowd-aggregator.ts       # Gate crowd counts from events
│   ├── crowd-clusters.ts         # DB persistence for co-location clusters
│   ├── crowd-clusters-model.ts   # Pure clustering algorithm (DB-free)
│   ├── crowd-model.ts            # Confidence + gate status logic
│   ├── db.ts                     # Mongo client singleton + telemetry helpers
│   ├── demo-data.ts              # Demo match + telemetry fixtures
│   ├── egress-ai.ts              # AI instruction generation (Gemini + NVIDIA NIM)
│   ├── egress-planner.ts         # Per-user egress plan (D6–D10)
│   ├── egress-stagger.ts         # Capacity-constrained stagger algorithm (D10)
│   ├── email.ts                  # Nodemailer for staff approval emails
│   ├── live-demo-engine.ts       # Demo mode deterministic data generator
│   ├── match-api.ts              # Football-data.org / API-Football client
│   ├── match-cache.ts            # In-memory match cache
│   ├── mongo-indexes.ts          # Index creation helpers
│   ├── privacy.ts                # PII hashing, consent flags
│   ├── tracking/                 # Position tracking core
│   │   ├── consent.ts            # Consent persistence
│   │   └── CrowdDetector.ts      # Geofence + BLE beacon logic
│   ├── venue-config.ts           # **Single source of truth** for gates, beacons, thresholds
│   └── bg-images.ts              # Background image rotation
├── types/
│   ├── auth.ts                   # UserDocument, Role, StaffStatus + NextAuth augmentation
│   ├── position.ts               # PositionEvent, GateCrowd, EgressPlan, GateSummary
│   └── telemetry.ts              # StadiumTelemetry, GateMetrics, AppTab
├── constants/
│   └── theme.ts                  # Design tokens (colors, radii, fonts)
└── framework/                    # Python orchestration (experimental)
    ├── orchestrator.py
    ├── session_manager.py
    ├── context_trimmer.py
    ├── tool_schemas.py
    └── config.py
```

---

## 3. Core Domains & Data Flow

### 3.1 Authentication & Authorization

| Layer | Implementation |
|-------|----------------|
| **Provider** | NextAuth v4 (Google OAuth, Credentials email/password, Google OneTap) |
| **Session** | JWT strategy (`session: { strategy: "jwt" }`) |
| **Roles** | `fan` (default), `staff`, `admin` — stored in MongoDB `users` collection |
| **Staff Flow** | User registers → `staffStatus: "pending"` → Admin approves/rejects → `staffStatus: "approved" + role: "staff"` |
| **Route Guards** | `ProtectedRoute` component (client) + `getServerSession` in API routes |
| **Module Augmentation** | `src/types/auth.ts` extends `next-auth` `Session`, `User`, `JWT` |

**Key files**:
- `src/lib/auth.ts` — NextAuth config with 3 providers
- `src/lib/auth/users.ts` — User CRUD, sparse unique indexes on `email` and `googleId`
- `src/components/auth/ProtectedRoute.tsx` — Client-side role guard
- `src/app/(auth)/signup/page.tsx` — Staff registration form

---

### 3.2 Real-Time Crowd Detection (Design D1–D9)

**Design Reference**: `Design-20260713-production-realtime-tracking.md`

| Design Decision | Implementation |
|-----------------|----------------|
| **D1** Real sources | Fan phones emit `geofence_enter/exit`, `beacon_nearby` events via `/api/track/event` |
| **D2** Crowd = phone clusters | Server-side DBSCAN-like clustering in `crowd-clusters-model.ts` (proximity radius 25m) |
| **D3** Events, not GPS | Ingest `PositionEvent` (no continuous GPS stream); store in `position_events` collection with TTL |
| **D4** Staff phones as anchors | Staff events tagged `eventType: "staff_beacon"` — boost confidence |
| **D5** 5-min lookback | `LOOKBACK_WINDOW_MS = 5 * 60_000` |
| **D6** GenAI per-user | `egress-ai.ts` → Gemini + NVIDIA NIM fallback |
| **D7** Post-match egress | `generateEgressPlan` + `staggerEgress` |
| **D8** Cache on device | `/api/track/plan` returns `version`; client caches; SSE `/api/track/stream` pushes updates |
| **D9** Confidence gating | `CONFIDENCE_THRESHOLD = 0.35` — below → `deferToStewards: true` |

**Pipeline**:
```
Phone → /api/track/event → position_events collection
                      ↓
              aggregateClusters() (cron or on-demand)
                      ↓
              crowd_clusters collection (TTL 24h)
                      ↓
              aggregateCrowd() → GateCrowd[] { gateId, count, confidence, optInCount, capacityThreshold }
                      ↓
              /api/telemetry, /api/staff/metrics, /api/track/plan
```

**Key files**:
- `src/lib/crowd-clusters-model.ts` — Pure clustering (unit-testable)
- `src/lib/crowd-clusters.ts` — DB persistence layer
- `src/lib/crowd-aggregator.ts` — Gate-level aggregation
- `src/lib/crowd-model.ts` — Confidence + status classification
- `src/lib/venue-config.ts` — **Canonical gate config** (8 gates, positions, capacities, beacons)
- `src/lib/tracking/CrowdDetector.ts` — Client-side geofence + BLE logic
- `src/app/api/track/event/route.ts` — Event ingestion endpoint

---

### 3.3 Egress Planning (D6–D10)

**Per-user plan** (`/api/track/plan` GET):
1. Parse user position → 2D coordinate
2. Compute ETA to each gate (walk speed 80 m/min)
3. Filter gates by confidence ≥ 0.35
4. Score: 70% capacity weight + 30% ETA weight
5. Pick best non-critical gate
6. Generate leave window + transit ETA
7. AI-enhanced instruction (Gemini → NVIDIA NIM → template fallback)
8. Return `{ plan, version }` — client caches, SSE pushes updates

**Batch stagger** (`/api/track/plan` POST):
- Input: many users with `etaToGate`, `earliestArrival`
- Algorithm: `staggerEgress` in `egress-stagger.ts`
- Capacity-constrained flow assignment per gate
- Returns `{ assignments[], deferredCount, totalEgressMinutes }`

**Key files**:
- `src/lib/egress-planner.ts` — `generateEgressPlan`, `parseUserPosition`
- `src/lib/egress-stagger.ts` — `staggerEgress`
- `src/lib/egress-ai.ts` — `enhancePlanWithAI`, `generateAIInstruction`
- `src/app/api/track/plan/route.ts` — GET + POST endpoints

---

### 3.4 Match Data & Demo Mode

| Source | Implementation |
|--------|----------------|
| **Live** | `football-data.org` or `api-football` via `match-api.ts` (configurable in Admin → Developer Settings) |
| **Cache** | In-memory `match-cache.ts` (TTL configurable) |
| **Demo** | `live-demo-engine.ts` — deterministic pseudo-live data (seeded randomness) |
| **Hook** | `useMatchData.ts` — polls `/api/match` + `/api/match/schedule` |
| **UI** | `MatchScoreboard`, `MatchSchedule` |

---

### 3.5 AI Copilot (FanAssist)

- **Streaming chat** via `/api/chat` (SSE) → `useChatStream` hook → `AICopilotChat` component
- **Context**: live match, telemetry, user's egress plan, crowd data
- **Model**: Google Generative AI (`@google/generative-ai`) — Gemini 1.5 Flash
- **Fallback**: Structured template responses when API unavailable

---

### 3.6 Admin Console

| Page | Component | API |
|------|-----------|-----|
| `/admin/manage-staff` | `StaffApprovalQueue` | `GET /api/admin/users?staffStatus=pending`, `POST /api/admin/staff/[id]/approve|reject` |
| `/admin/users` | `UserTable` | `GET /api/admin/users` |
| `/admin/settings` | `DeveloperSettings` | `GET/POST /api/admin/settings` |

**Feature flags** (stored in DB, read by `DemoController`):
- `enableRealMatchData`
- `enableOneTap`
- `enableHeatmapAnimation`

---

## 4. Configuration & Environment

### 4.1 Required Environment Variables (`.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `MONGODB_DB` | Database name (default: `stadium_ops`) | `stadium_ops` |
| `NEXTAUTH_SECRET` | NextAuth signing secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical app URL | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `GOCSPX-...` |
| `GEMINI_API_KEY` | Google Generative AI key | `AQ.Ab8RN...` |
| `NVIDIA_NIM_API_KEY` | NVIDIA NIM fallback for AI | `nvapi-...` |
| `FOOTBALL_DATA_API_KEY` | football-data.org API key | (optional) |
| `API_FOOTBALL_KEY` | API-Football key | (optional) |
| `MATCH_API_PROVIDER` | `football-data` or `api-football` | `football-data` |
| `MATCH_API_CACHE_TTL` | Cache TTL seconds | `300` |

### 4.2 Design Tokens (`src/constants/theme.ts` + `globals.css`)

- **Colors**: Zinc/emerald/amber semantic palette (dark-first)
- **Typography**: Geist Sans + Geist Mono (next/font)
- **Radius scale**: `--radius-sm` through `--radius-4xl`
- **Animation**: `motion/react` (Framer Motion v12)

---

## 5. Testing

| Layer | Tool | Config |
|-------|------|--------|
| Unit | Jest + ts-jest + jsdom | `jest.config.js` |
| E2E | Playwright | `playwright.config.ts` |
| Components | React Testing Library | `@testing-library/react` |

**Test files** (co-located or in `src/`):
- `src/lib/auth.test.ts`, `src/lib/auth/users.test.ts`
- `src/lib/crowd-aggregator.test.ts`, `src/lib/crowd-clusters.test.ts`
- `src/lib/egress-planner.test.ts`, `src/lib/egress-stagger.test.ts`
- `src/components/LiveQueryTicker.test.tsx`
- `src/app/staff/page.test.tsx`

Run: `npm test` or `npx playwright test`

---

## 6. Key Algorithms (Reference)

### 6.1 Confidence Model (`crowd-model.ts:computeConfidence`)

```
base = sigmoid(k=12, midpoint=0.15)(optInRate)
recency = max(0.5, 1 - newestEventAgeMs / (LOOKBACK_WINDOW_MS * 2))
confidence = min(1, base * recency)
```

### 6.2 Gate Scoring (`egress-planner.ts:generateEgressPlan`)

```
score = (1 - capacityPct/100) * 0.7 + (1 - min(eta, 15)/15) * 0.3
```

### 6.3 Stagger Algorithm (`egress-stagger.ts:staggerEgress`)

Greedy earliest-arrival assignment per gate, respecting `capacityThreshold` per time window.

---

## 7. Deployment Notes

| Platform | Config |
|----------|--------|
| **Vercel** | `next.config.ts` sets `serverExternalPackages: ["redis"]` (optional rate-limiting) |
| **MongoDB** | Atlas cluster; indexes created lazily via `ensureUniqueIndexes` in `users.ts` |
| **Redis** | Optional — only if `RATE_LIMIT_REDIS_URL` set |
| **Build** | `next build` (Turbopack root set in `next.config.ts`) |

---

## 8. Known Gaps / TODOs

| Area | Status |
|------|--------|
| Redis rate-limiting | Stubbed in `next.config.ts` — not wired |
| SSE reconnection | Basic `EventSource` — no exponential backoff |
| Staff push notifications | Email only (`email.ts`) — no mobile push |
| Multi-stadium support | Single stadium config in `venue-config.ts` |
| i18n beyond egress | Only egress instructions are multi-language |
| Test coverage | ~60% lib, ~20% components |
| Accessibility audit | Not yet run (axe, lighthouse) |
| Python framework | Experimental — not used in production |

---

## 9. File Map (Quick Reference)

```
src/
├── app/
│   ├── (admin)/dashboard/page.tsx
│   ├── (admin)/manage-staff/page.tsx
│   ├── (admin)/settings/page.tsx
│   ├── (admin)/users/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── api/admin/settings/route.ts
│   ├── api/admin/staff/[id]/approve/route.ts
│   ├── api/admin/staff/[id]/reject/route.ts
│   ├── api/admin/stats/route.ts
│   ├── api/admin/users/route.ts
│   ├── api/auth/[...nextauth]/route.ts
│   ├── api/auth/register/route.ts
│   ├── api/chat/route.ts
│   ├── api/config/route.ts
│   ├── api/fan/queries/route.ts
│   ├── api/fan/queries/stream/route.ts
│   ├── api/health/route.ts
│   ├── api/match/route.ts
│   ├── api/match/schedule/route.ts
│   ├── api/og/route.ts
│   ├── api/staff/metrics/route.ts
│   ├── api/staff/register/route.ts
│   ├── api/staff/status/route.ts
│   ├── api/telemetry/route.ts
│   ├── api/track/consent/route.ts
│   ├── api/track/crowd/route.ts
│   ├── api/track/event/route.ts
│   ├── api/track/nearby/route.ts
│   ├── api/track/plan/route.ts
│   ├── api/track/setup/route.ts
│   ├── api/track/staff/route.ts
│   ├── api/track/stream/route.ts
│   └── api/track/summary/route.ts
├── components/
│   ├── admin/DeveloperSettings.tsx
│   ├── admin/StaffApprovalQueue.tsx
│   ├── admin/UserTable.tsx
│   ├── auth/GoogleOneTap.tsx
│   ├── auth/LoginForm.tsx
│   ├── auth/ProtectedRoute.tsx
│   ├── auth/SessionProvider.tsx
│   ├── auth/SignupForm.tsx
│   ├── auth/UserMenu.tsx
│   ├── heatmap/StadiumSVG.tsx
│   ├── heatmap/ThermalGrid.tsx
│   ├── heatmap/StadiumMap.tsx
│   ├── AICopilotChat.tsx
│   ├── ConnectionGuard.tsx
│   ├── DemoController.tsx
│   ├── EgressPlanCard.tsx
│   ├── EnforcementPanel.tsx
│   ├── FanHub.tsx
│   ├── GateAlertsPanel.tsx
│   ├── GuidedWalkthrough.tsx
│   ├── HeatmapSelector.tsx
│   ├── LiveQueryTicker.tsx
│   ├── LiveStatusCards.tsx
│   ├── MatchScoreboard.tsx
│   ├── MatchSchedule.tsx
│   ├── OperationalInsights.tsx
│   ├── StaffHub.tsx
│   ├── StadiumBackground.tsx
│   ├── TransitDashboard.tsx
│   └── ui/{button,card,badge,input,modal,scroll-area,separator,tabs}.tsx
├── hooks/
│   ├── useChatStream.ts
│   ├── useCrowdDetection.ts
│   ├── useEgressPlan.ts
│   ├── useMatchData.ts
│   ├── useOneTap.ts
│   ├── useOnlineStatus.ts
│   └── useStaffStatus.ts
├── lib/
│   ├── auth.ts
│   ├── auth/session.ts
│   ├── auth/users.ts
│   ├── auth/utils.ts
│   ├── bg-images.ts
│   ├── crowd-aggregator.ts
│   ├── crowd-clusters.ts
│   ├── crowd-clusters-model.ts
│   ├── crowd-model.ts
│   ├── db.ts
│   ├── demo-data.ts
│   ├── egress-ai.ts
│   ├── egress-planner.ts
│   ├── egress-stagger.ts
│   ├── email.ts
│   ├── live-demo-engine.ts
│   ├── match-api.ts
│   ├── match-cache.ts
│   ├── mongo-indexes.ts
│   ├── privacy.ts
│   ├── tracking/consent.ts
│   ├── tracking/CrowdDetector.ts
│   ├── utils.ts
│   └── venue-config.ts
├── types/
│   ├── auth.ts
│   ├── position.ts
│   └── telemetry.ts
└── constants/theme.ts
```