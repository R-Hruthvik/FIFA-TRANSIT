# Production Real-Time Tracking System

Implementation of `design-20260713-production-realtime-tracking.md` — the production-grade path for FIFA 2026 crowd management and egress orchestration.

## Architecture

```
Fan/staff phones (opt-in, incentive-gated)
  │  geofence-transition + BLE-beacon EVENTS (not GPS stream)
  ▼  POST /api/track/event (idempotent, rate-limited)
MongoDB: position_events (append-only, TTL 24h)  ──► privacy.ts anonymizes → anon_cohort_stats
        │
Aggregation (stateless, on-read): crowd-aggregator.ts
  │  cluster by gateId → GateCrowd[]  + confidence gating (D2/D9)
  ▼  MongoDB: gate_crowd (upsert)
        │
Change-poll → SSE push /api/track/stream (event-driven, D4)
        ▼
Command Center (staff + fan) + GenAI synthesis (D6)
  ├── Pre-match: egress-planner.ts → EgressPlan (cached on-device, D8-B)
  ├── Post-match: stagger.ts (D10) assigns leave-windows by capacity
  └── Low confidence at any gate → defer to stewards (D9), never guess
```

## Design premises implemented

| Premise | File | Mechanism |
|---|---|---|
| D1 — Real sources | `api/track/event` | Phone events only, no sim ingestion in prod |
| D2 — Cluster inference | `lib/crowd-aggregator.ts` | Cluster by gateId, venue feed = enrichment |
| D3 — Events not GPS | `api/track/event` + `types/position.ts` | Geofence + BLE beacon events |
| D4 — Stateless + SSE | `api/track/stream` | Aggregate-on-read, change-poll push |
| D6 — Per-user reasoning | `lib/egress-ai.ts` | Injects user{} + gates + ETA into prompt |
| D7 — Egress headline | `lib/egress-planner.ts` | Post-match leave-window + gate |
| D8 — B+A delivery | `hooks/useEgressPlan.ts` | Cached baseline + live SSE reroute |
| D9 — Confidence gating | `lib/crowd-aggregator.ts`, `components/EgressPlanCard.tsx` | Defer-to-steward UI, no guessing |
| D10 — Capacity stagger | `lib/egress-stagger.ts` | Gates as throughput sinks, flow assignment |
| D11 — Both enforcement | `components/EnforcementPanel.tsx` | Staff dashboard + GO ping surface |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/track/event` | Ingest position event (D1/D3) |
| GET | `/api/track/crowd` | Latest gate crowd data |
| GET | `/api/track/summary` | Fan-facing gate summary (D9-filtered) |
| GET | `/api/track/stream` | SSE live push (D4/D8-A) |
| GET/POST | `/api/track/plan` | Egress plan gen / stagger batch (D6/D7/D10) |
| GET | `/api/track/staff` | Staff aggregate + enforcement (D11) |
| GET | `/api/track/setup` | Create indexes + run anonymization sweep (D9) |

## Local testing

```bash
# Seed synthetic events (TEST ONLY — never in prod)
npm run ts-node scripts/seed-events.ts 200

# Run unit tests
npx jest src/lib/egress-planner.test.ts src/lib/egress-stagger.test.ts

# Init DB indexes + privacy sweep
curl localhost:3000/api/track/setup
```

## Privacy (D9 hard requirement)

- `position_events` has a 24h TTL index — raw location data auto-expires
- `deviceHash` is used only for rate-limiting in the request, never stored
- `userId` is pseudonymized
- `anon_cohort_stats` holds only aggregate counts (no PII survives past 24h)
- Below-confidence gates show "Follow Steward Directions" — not a guessed route

## Out of scope (honest gaps)

- Exact `f(opt-in rate)` curve tuning per venue size (start: sigmoid @ 15% midpoint)
- Calibration math when venue server feed is present
- On-device service worker for true offline cache (IndexedDB cache is in place)
- Production-grade rate limiting (currently in-memory, process-local)
