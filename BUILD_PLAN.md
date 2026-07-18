# Build Plan — Fix Issues from `issues.txt`

## Context

The FIFA Transit App is a Next.js 16 + React 19 real-time stadium operations dashboard. `issues.txt` lists 7 problems:

1. `Plan fetch failed: 500` console errors from `useEgressPlan.ts:192`
2. No connection/internet check
3. No real data — many fake data placeholders in tactical insights
4. No API health check
5. No home page format
6. Dashboard opens half-scrolled to chat section
7. Fake data should only appear in demo mode

---

## Phase 1: Fix Critical Bugs

### 1a. Graceful plan fetch failure

**Files**: `src/hooks/useEgressPlan.ts`, `src/app/api/track/plan/route.ts`

**Problem**: `useEgressPlan.ts:192` throws `Plan fetch failed: 500`. When MongoDB is down, `/api/track/plan` returns 500, the hook enters an error state, and the cached plan from IndexedDB is never surfaced.

**Fix**:
- `useEgressPlan.ts:192`: Replace `throw new Error(...)` with a soft error. Log it, set `isLoading: false`, and **fall back to the cached plan** from IndexedDB. This is the core design intent (D8-B baseline: cache is the always-works fallback).
- `src/app/api/track/plan/route.ts`: Wrap `aggregateCrowd()` and `generateEgressPlan()` in try/catch. Return `{ plan: null, deferred: true, reason: "..." }` with status 200 instead of 500. The `EgressPlanCard` already handles `deferred: true` (shows "FOLLOW STEWARDS").

### 1b. Suppress SSE error floods

**Files**: `src/app/api/track/stream/route.ts`, `src/app/api/fan/queries/stream/route.ts`

**Problem**: When MongoDB is unreachable, both SSE endpoints log `SSE poll error:` every 2 seconds indefinitely.

**Fix**: In the `catch` block of both stream routes, detect `MongoServerSelectionError` / `ENOTFOUND` and:
- Log once with a `"MongoDB unreachable — suppressing further logs"` message
- Increase poll interval to 10s (from 2s) after consecutive failures
- Still send heartbeats to keep the connection alive

### 1c. Add `/api/health` endpoint

**New file**: `src/app/api/health/route.ts`

Lightweight health check:
```
GET /api/health → { status: "ok" | "degraded" | "down", mongo: boolean, timestamp: number }
```
- Attempt `clientPromise` ping with 2s timeout
- Return `down` on ENOTFOUND/MongoNetworkError, `degraded` on timeout, `ok` if connected

---

## Phase 2: Connection Awareness

### 2a. Create `useOnlineStatus` hook

**New file**: `src/hooks/useOnlineStatus.ts`

- Tracks `navigator.onLine` + `online`/`offline` browser events
- Polls `/api/health` every 15s when online
- Returns `{ isOnline, isApiHealthy, lastChecked }`

### 2b. Create `ConnectionGuard` component

**New file**: `src/components/ConnectionGuard.tsx`

- Wraps dashboard content areas
- When offline: shows dismissible banner "You're offline — showing cached data"
- When API down: shows "Limited connectivity — some features unavailable"
- Provides visual distinction between cached and live data

### 2c. Integrate into FanHub and StaffHub

- `FanHub.tsx`: Wrap content with ConnectionGuard. Disable AI chat submit when offline.
- `StaffHub.tsx`: Same — disable live-updating insights when offline.

---

## Phase 3: Gate Fake Data Behind Demo Mode

### 3a. Make `OperationalInsights.tsx` demo-aware

**File**: `src/components/OperationalInsights.tsx`

**Current**: `generateInsights()` maps gate status strings (low/medium/high) to static tactical templates. This is fake data masquerading as real analysis.

**Fix**:
- Import `useDemoMode()` from `DemoController`
- When `isDemoMode === true`: keep current behavior (demo scenario)
- When `isDemoMode === false`: show raw gate metrics with no fabricated tactical recommendations. Show "Live analysis will appear here when operational data is available."

### 3b. Audit all fake data usage

| File | Issue | Fix |
|------|-------|-----|
| `src/components/TransitDashboard.tsx` | Hardcoded `mockData` constant | Gate behind `isDemoMode` or remove component |
| `src/lib/egress-stagger.ts` | `generateMockCrowd()` / `generateMockUsers()` | These are only used in tests, keep them but ensure no production import |
| `src/lib/egress-planner.ts:224` | `transitEtaMinutes = 8 + Math.floor(Math.random() * 5)` | Already labeled as mock — acceptable as fallback when real transit data unavailable |

**Rule**: Real data from API → default. Fake data → ONLY via `useDemoMode()` or `demo-data.ts`.

---

## Phase 4: Homepage Format

### 4a. Replace hero-only landing with a real homepage

**File**: `src/app/page.tsx`

**Current**: Hero section → "Enter Command Center" button → dashboard. The hero acts as a gate.

**New layout**:
- **Header/Nav** — App title, Fan/Staff tab switcher, Demo Mode button, connection status indicator
- **Hero section** (kept, but smaller) — Animated trophy + tagline
- **Feature cards** — "Fan Guidance", "Staff Command", "Live Telemetry"
- **Dashboard** — FanHub or StaffHub rendered below (no "Enter" gate)

**Implementation**:
- Remove `showHero` state toggle. Render hero + dashboard together.
- Keep `AnimatePresence` for tab switching only.
- Add a `Header` component with navigation and connection indicator.

---

## Phase 5: Fix Scroll Behavior

### 5a. Dashboard starts at top

**Files**: `src/app/page.tsx`, `src/components/AICopilotChat.tsx`

**Fix**:
- In `page.tsx`: After transitioning to dashboard, call `window.scrollTo({ top: 0, behavior: 'instant' })`
- In `AICopilotChat.tsx:13-15`: `scrollToBottom()` runs on mount. Add a `hasMounted` ref so it only auto-scrolls when a new user message arrives, not on initial render.

---

## Phase 6: Simulated Multi-User Demo (Future)

### 6a. Research approach for simulating connected users

**Future work** — build after Phase 1-5 are stable.

- Create a `SimulationProvider` (separate from `DemoProvider`) that injects synthetic position events via POST to `/api/track/event`
- Add `SimulationControls` panel (staff-only): set user count, distribution pattern (uniform/clustered), start/stop
- Simulation feeds into `crowd-aggregator.ts` → `gate_crowd` collection → SSE streams → all dashboards update

---

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useEgressPlan.ts` | Graceful error + cache fallback |
| `src/app/api/track/plan/route.ts` | Return `deferred: true` instead of 500 |
| `src/app/api/track/stream/route.ts` | Suppress repeated error logs + backoff |
| `src/app/api/fan/queries/stream/route.ts` | Suppress repeated error logs |
| `src/app/api/health/route.ts` | **NEW** — health check |
| `src/hooks/useOnlineStatus.ts` | **NEW** — connectivity hook |
| `src/components/ConnectionGuard.tsx` | **NEW** — offline banner |
| `src/components/OperationalInsights.tsx` | Gate fake data behind demo mode |
| `src/components/TransitDashboard.tsx` | Gate mockData behind demo mode |
| `src/components/FanHub.tsx` | Wrap with ConnectionGuard |
| `src/components/StaffHub.tsx` | Wrap with ConnectionGuard |
| `src/app/page.tsx` | New homepage layout |
| `src/components/AICopilotChat.tsx` | Fix auto-scroll on mount |

## Verification

1. `npm run dev` — no `Plan fetch failed: 500` in console
2. Disable MongoDB (unset MONGODB_URI) — app shows offline state, cached data works, no error flood
3. Toggle demo mode — fake insights appear only in demo mode
4. Refresh dashboard — page starts at top
5. Check homepage — has content sections, not just hero button
6. `curl /api/health` — returns status with/without MongoDB
