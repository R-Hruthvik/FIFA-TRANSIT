# StadiumFlow — 2026 World Cup Transit Management

> **Unified digital control system for FIFA World Cup 2026 stadium operations, fan engagement, and real-time transit management.**

![Status](https://img.shields.io/badge/status-hackathon_ready-emerald)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

---

## What It Does

### Fan Hub (Ticket Holders)
- **Live Match Scoreboard** — Real-time match data from football-data.org / API-Football
- **Crowd Telemetry** — Nearest gate status, transit hub wait times, weather advisories
- **FanAssist AI Copilot** — Streaming chat with context (match, telemetry, egress plan, crowd data)
- **Personalized Egress Plans** — Per-user leave window, gate assignment, multilingual instructions
- **Crowd Detection Opt-In** — Geofence + BLE beacon proximity, anonymized, no GPS trail stored

### Staff Hub (Operations / Security)
- **Congestion Heatmaps** — 3 interchangeable visualizations: SVG Stadium, Thermal Grid, Geometric Map
- **Live Gate Alerts** — Real-time crowd status changes, capacity warnings
- **Enforcement Panel** — Steward dispatch, gate closure/opening actions
- **Operational Insights** — Dynamic, severity-ranked tactical recommendations
- **Admin Logs** — System events, crowd alerts, staff actions

### Admin Console (Administrators)
- **Staff Approval Queue** — Review/approve/reject staff registration requests
- **User Management** — Searchable user table with roles and staff status
- **Developer Settings** — Feature flags, match API provider/key/cache config

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.2 (App Router, Turbopack) |
| **Language** | TypeScript 5.9 (strict) |
| **Runtime** | React 19 |
| **Database** | MongoDB Atlas (connection caching) |
| **Auth** | NextAuth v4 (Google OAuth, Credentials, Google OneTap) |
| **AI** | Google Generative AI (Gemini 1.5 Flash) + NVIDIA NIM (Llama 3.1 70B) fallback |
| **Real-Time** | Server-Sent Events (SSE) with polling fallback |
| **UI** | Tailwind CSS v4 + shadcn-style primitives + Phosphor Icons + Lucide |
| **Animation** | Motion (Framer Motion 12) |
| **Testing** | Jest + React Testing Library + Playwright |
| **Deploy** | Vercel |

---

## Quick Start

```bash
# 1. Clone & install
git clone <repo-url> fifa-transit-app
cd fifa-transit-app
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your keys (see Environment Variables below)

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

### Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
MONGODB_DB=stadium_ops

# Auth (NextAuth v4)
NEXTAUTH_SECRET=openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# AI
GEMINI_API_KEY=AQ.xxx
NVIDIA_NIM_API_KEY=nvapi-xxx

# City-transit grounding (Google Maps Routes API)
GOOGLE_MAPS_API_KEY=xxx

# Autonomous ops-agent cron auth (Bearer token for scheduler-triggered runs)
CRON_SECRET=openssl-rand-base64-32

# Match Data (pick one provider)
FOOTBALL_DATA_API_KEY=xxx
API_FOOTBALL_KEY=xxx
MATCH_API_PROVIDER=football-data  # or "api-football"
MATCH_API_CACHE_TTL=300

# Optional: Redis for rate limiting
RATE_LIMIT_REDIS_URL=redis://localhost:6379
```

---

## Architecture Overview

```
src/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Admin route group (protected)
│   │   ├── dashboard/            # Admin dashboard
│   │   ├── manage-staff/         # Staff approval queue
│   │   ├── settings/             # Developer settings
│   │   └── users/                # User management
│   ├── (auth)/                   # Auth route group
│   │   ├── login/                # Sign-in page
│   │   └── signup/               # Staff registration
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
│   │   └── track/                # Position events + egress planning
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
│   ├── ui/                       # shadcn-style primitives
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
│   │   ├── auth.ts               # NextAuth options (3 providers)
│   │   ├── session.ts            # Server session helper
│   │   ├── users.ts              # User CRUD + indexes
│   │   └── utils.ts              # Role helpers
│   ├── crowd-aggregator.ts       # Gate crowd counts from events
│   ├── crowd-clusters.ts         # DB persistence for co-location clusters
│   ├── crowd-clusters-model.ts   # Pure clustering algorithm (DB-free)
│   ├── crowd-model.ts            # Confidence + gate status logic
│   ├── db.ts                     # Mongo client singleton + telemetry helpers
│   ├── demo-data.ts              # Demo match + telemetry fixtures
│   ├── egress-ai.ts              # AI instruction generation (Gemini + NVIDIA)
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
│   ├── utils.ts                  # General utilities
│   ├── venue-config.ts           # SINGLE SOURCE OF TRUTH for gates/beacons
│   └── bg-images.ts              # Background image rotation
├── types/
│   ├── auth.ts                   # UserDocument, Role, StaffStatus + NextAuth augmentation
│   ├── position.ts               # PositionEvent, GateCrowd, EgressPlan, GateSummary
│   └── telemetry.ts              # StadiumTelemetry, GateMetrics, AppTab
├── constants/
│   └── theme.ts                  # Design tokens
└── framework/                    # Python orchestration (experimental)
    ├── orchestrator.py
    ├── session_manager.py
    ├── context_trimmer.py
    ├── tool_schemas.py
    └── config.py
```

---

## Core Domains

### Authentication & Authorization
- **NextAuth v4** with JWT strategy
- **3 Providers**: Google OAuth, Email/Password (Credentials), Google OneTap
- **Roles**: `fan` (default), `staff`, `admin` — stored in MongoDB
- **Staff Flow**: Register → `pending` → Admin approves → `approved` + `role: staff`
- **Route Guards**: `ProtectedRoute` component (client) + `getServerSession` (API)

### Real-Time Crowd Detection (Design D1–D9)
| Design | Implementation |
|--------|----------------|
| **D1** Real sources | Fan phones emit `geofence_enter/exit`, `beacon_nearby` via `/api/track/event` |
| **D2** Crowd = phone clusters | DBSCAN-like clustering in `crowd-clusters-model.ts` (25m proximity radius) |
| **D3** Events, not GPS | `PositionEvent` ingestion; stored in `position_events` with TTL |
| **D4** Staff anchors | Staff events tagged `staff_beacon` → confidence boost |
| **D5** 5-min lookback | `LOOKBACK_WINDOW_MS = 5 * 60_000` |
| **D6** GenAI per-user | `egress-ai.ts` → Gemini → NVIDIA NIM fallback |
| **D7** Post-match egress | `generateEgressPlan` + `staggerEgress` |
| **D8** Cache on device | `/api/track/plan` returns `version`; client caches; SSE pushes updates |
| **D9** Confidence gating | `CONFIDENCE_THRESHOLD = 0.35` → `deferToStewards: true` |

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

### Egress Planning (Design D6–D10)

**Per-user plan** (`GET /api/track/plan`):
1. Parse user position → 2D coordinate
2. Compute ETA to each gate (walk speed 80 m/min)
3. Filter gates by confidence ≥ 0.35
4. Score: 70% capacity weight + 30% ETA weight
5. Pick best non-critical gate
6. Generate leave window + transit ETA
7. AI-enhanced instruction (Gemini → NVIDIA NIM → template fallback)
8. Return `{ plan, version }` — client caches, SSE pushes updates

**Batch stagger** (`POST /api/track/plan`):
- Input: many users with `etaToGate`, `earliestArrival`
- Algorithm: `staggerEgress` in `egress-stagger.ts`
- Capacity-constrained flow assignment per gate
- Returns `{ assignments[], deferredCount, totalEgressMinutes }`

### Match Data & Demo Mode
| Source | Implementation |
|--------|----------------|
| **Live** | `football-data.org` or `api-football` via `match-api.ts` (configurable in Admin) |
| **Cache** | In-memory `match-cache.ts` (TTL configurable) |
| **Demo** | `live-demo-engine.ts` — deterministic pseudo-live data (seeded randomness) |
| **Hook** | `useMatchData.ts` — polls `/api/match` + `/api/match/schedule` |
| **UI** | `MatchScoreboard`, `MatchSchedule` |

### AI Copilot (FanAssist)
- Streaming chat via `/api/chat` (SSE) → `useChatStream` hook → `AICopilotChat` component
- Context: live match, telemetry, user's egress plan, crowd data
- Model: Google Generative AI (Gemini 1.5 Flash)

### Admin Console
| Page | Component | API |
|------|-----------|-----|
| `/admin/manage-staff` | `StaffApprovalQueue` | `GET /api/admin/users?staffStatus=pending`, `POST /api/admin/staff/[id]/approve\|reject` |
| `/admin/users` | `UserTable` | `GET /api/admin/users` |
| `/admin/settings` | `DeveloperSettings` | `GET/POST /api/admin/settings` |

**Feature flags** (stored in DB, read by `DemoController`):
- `enableRealMatchData`
- `enableOneTap`
- `enableHeatmapAnimation`

---

## Key Algorithms

### Confidence Model (`lib/crowd-model.ts`)
```typescript
base = sigmoid(k=12, midpoint=0.15)(optInRate)
recency = max(0.5, 1 - newestEventAgeMs / (LOOKBACK_WINDOW_MS * 2))
confidence = min(1, base * recency)
THRESHOLD = 0.35  // below → deferToStewards
```

### Gate Scoring (`lib/egress-planner.ts`)
```typescript
score = (1 - capacityPct/100) * 0.7 + (1 - min(eta, 15)/15) * 0.3
```

### Stagger Algorithm (`lib/egress-stagger.ts`)
Greedy earliest-arrival assignment per gate, respecting `capacityThreshold` per time window.

---

## Scripts

```bash
npm run dev       # Next.js dev (Turbopack)
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint (Next.js config)
npm test          # Jest unit tests
npx playwright test  # E2E tests
```

---

## Testing

| Layer | Command |
|-------|---------|
| Unit | `npm test` (Jest + ts-jest + jsdom) |
| E2E | `npx playwright test` |
| Coverage | `npm test -- --coverage` |

**Test files** (co-located or in `src/`):
- `lib/auth.test.ts`, `lib/auth/users.test.ts`
- `lib/crowd-aggregator.test.ts`, `lib/crowd-clusters.test.ts`
- `lib/egress-planner.test.ts`, `lib/egress-stagger.test.ts`
- `components/LiveQueryTicker.test.tsx`
- `app/staff/page.test.tsx`

---

## Deployment

### Vercel (Recommended)
```bash
vercel link
vercel env add MONGODB_URI
vercel env add NEXTAUTH_SECRET
# ... add all env vars
vercel deploy --prod
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### MongoDB Indexes
Created lazily on first write via `ensureUniqueIndexes()` in `lib/auth/users.ts`:
- `users.email` — unique, sparse
- `users.googleId` — sparse (non-unique, allows multiple nulls)

---

## Design System

- **Colors**: Zinc/emerald/amber semantic palette (dark-first)
- **Typography**: Geist Sans + Geist Mono (`next/font/google`)
- **Radius**: `--radius-sm` through `--radius-4xl` (0.625rem base)
- **Animation**: `motion/react` (Framer Motion 12)
- **Icons**: Phosphor Icons + Lucide React
- **UI Primitives**: Custom shadcn-style components in `components/ui/`

---

## Known Gaps / Roadmap

- [ ] Redis rate-limiting (stubbed in `next.config.ts`)
- [ ] SSE reconnection with exponential backoff
- [ ] Mobile push notifications (email only currently)
- [ ] Multi-stadium support (single venue config now)
- [ ] Full i18n beyond egress instructions
- [ ] Accessibility audit (axe, Lighthouse)
- [ ] Increase test coverage (lib ~60%, components ~20%)
- [ ] Python orchestration framework (`src/framework/`) — experimental

---

## License

MIT — Built for the 2026 FIFA World Cup hackathon track.