# StadiumFlow — 2026 World Cup Transit Management

> **Unified digital control system for FIFA World Cup 2026 stadium operations, fan engagement, and real-time transit management.**

![Status](https://img.shields.io/badge/status-production_ready-emerald)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

---

## What It Does

### Fan Hub (Ticket Holders)
- **Live Match Scoreboard** — Real-time match fixtures and stats from `football-data.org` / `API-Football`
- **Crowd Telemetry** — Live gate density status, nearest transit hub info, and real-time weather advisories
- **FanAssist AI Copilot** — Streaming conversational agent grounded in match telemetry, egress plans, and crowd densities
- **Personalized Egress Plans** — Individual leave window recommendations, ETA calculations, BCP-47 multilingual instructions
- **Crowd Detection Opt-In** — Privacy-centric geofence and BLE beacon proximity tracking with zero persistent GPS trails

### Staff Hub (Operations / Security)
- **Congestion Heatmaps** — Radial SVG Stadium layout, thermal grids, and geographic overlays tracking crowds
- **Live Gate Alerts** — Status monitoring with automatic warning levels (nominal, busy, critical)
- **Enforcement Panel** — Live steward dispatch queue and manual gate limit overrides
- **Operational Insights** — AI-generated, prioritized tactical recommendations for stadium management
- **Admin Logs** — Persistent database auditing of system incidents, alerts, and dispatch actions

### Admin Console (Administrators)
- **Staff Approval Queue** — Review and approve or reject incoming staff registration requests
- **User Management** — Searchable roster of registered users with role and staff status management
- **AI Rate Limit Monitor** — Live diagnostics dashboard for active AI token buckets and consumption
- **Scenario Simulator** — Natural-language simulation generator that builds structured 60s training drills
- **Developer Settings** — Feature flags, match API configurations, and AI provider overrides

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.2.10 (App Router, Turbopack) |
| **Language** | TypeScript 5.9.3 (Strict) |
| **Runtime** | React 19.2.4 + React DOM 19.2.4 |
| **Database** | MongoDB Atlas (With Serverless Connection Caching & Pooling) |
| **Auth** | NextAuth v4 (Google OAuth, Google OneTap Credentials, Email/Password Credentials) |
| **AI** | Google Generative AI (Gemini 2.0 Flash / Pro) + NVIDIA NIM (Llama 3.1 70B) fallback |
| **Real-Time** | Server-Sent Events (SSE) with standard HTTP polling fallbacks |
| **UI** | Tailwind CSS v4 + Radix UI + Custom shadcn-style primitives + Phosphor Icons + Lucide React |
| **Animation** | Motion (Framer Motion 12.4.2) |
| **Testing** | Jest 30.4.2 + React Testing Library 16.3.2 + Playwright E2E |
| **Deploy** | Vercel |

---

## Live Demo Mode & Visual Tour

To facilitate local testing, training drills, and feature verification without live stadium hardware, StadiumFlow features a comprehensive **Live Demo Engine** that drives dynamic simulated metrics across both fan and staff dashboards.

### 1. Fan Hub Dashboard & Safety Fallback
![Fan Hub - Low Confidence Safety Fallback](screenshots/Screenshot%20from%202026-07-19%2019-40-11.png)
- **Congested Status** — Shows a simulated crowd density surge at the fan's assigned gate (Gate 3).
- **D9 Safety Fallback Banner** — Demonstrates the system's safe-fail logic. When crowd telemetry confidence drops below the required $0.35$ threshold, automated routing is suspended, and the UI displays a yellow warning banner prompting the fan to follow physical steward directions.
- **Scoreboard Ticker** — Feeds live match progression (such as USA vs England at MetLife Stadium) to the bottom ticker, keeping fans updated during egress.

---

### 2. FanAssist AI Copilot
![FanAssist AI Copilot Chat](screenshots/Screenshot%20from%202026-07-19%2019-40-19.png)
- **Context-Grounded Chat** — Provides an encrypted chat box for fans (represented by an ASCII profile block). 
- **Real-Time Event Logs** — The AI Copilot streams real-time updates directly into the chat interface—such as stadium goal announcements ("GOOOAL!") and crowd density alerts—enabling instant query checks for transit times and exit routes.

---

### 3. Operations Staff Hub & AI Tactical Commander
![Staff Hub - Live Telemetry & AI Commander](screenshots/Screenshot%20from%202026-07-19%2019-40-29.png)
- **Raw Telemetry Indicators** — Lists live density metrics (Low, Medium, High) for gates G1 through G8 on the right-hand panel.
- **AI Commander Processing** — Triggers live AI analysis of current crowd flows, displaying analytical loading states as the system generates tactical operational recommendations for stewards.

---

### 4. Incident Logs & Enforcement Alerts
![Staff Hub - Incident Logs & Safety Alerts](screenshots/Screenshot%20from%202026-07-19%2019-40-35.png)
- **Live Event Log Stream** — Displays dynamic, timestamped system logs detailing game event progression, simulated crowd escalation alerts, and automated dispatcher triggers.
- **Low Confidence Alerts** — Lists enforcement alerts warning operators when specific gates have low data confidence, highlighting active safety overrides in place.

---

### 5. Geometric Congestion Heatmap
![Staff Hub - Geometric Heatmap View](screenshots/Screenshot%20from%202026-07-19%2019-40-43.png)
- **Radial Node Layout** — Displays the **Geometric Map** layout variant of the stadium's layout, plotting gates radially around a central field of play with green and orange density circles.
- **AI Enforcement Copilot** — Provides staff with a direct terminal input field to dispatch stewards or apply gate controls (e.g. *"Limit Gate G3"* or *"Dispatch 4 stewards"*).

---

### 6. Thermal Grid Heatmap & Fan Query Stream
![Staff Hub - Thermal Grid View](screenshots/Screenshot%20from%202026-07-19%2019-41-04.png)
- **Thermal Grid Layout** — Shows the **Thermal Grid** heatmap variant, rendering gates as grid cards with color-coded warning levels and progress bars.
- **Live Fan Query Stream** — Displays an active log of incoming fan questions (e.g. transit wait times, security status check requests) to help operators assess crowd inquiries in real time.

---

### 7. Administrative Console
![Administrative Dashboard](screenshots/Screenshot%20from%202026-07-19%2019-41-24.png)
- **Operational Metrics** — Aggregates registered users, active staff counts, and pending applications.
- **Autonomous Operations Loop** — Monitors the active status of the background AI operations agent as it runs periodic checks on stadium safety conditions.

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

Configure these variables inside your local environment configuration:

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
MONGODB_DB=stadium_ops

# Auth (NextAuth v4)
NEXTAUTH_SECRET=openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# AI Providers
GEMINI_API_KEY=AQ.xxx
NVIDIA_NIM_API_KEY=nvapi-xxx

# City-transit & Geocoding (Google Maps API)
GOOGLE_MAPS_API_KEY=xxx

# Optional: OpenWeather integration (Open-Meteo is used by default with no keys needed)
OPENWEATHER_API_KEY=xxx

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

## Core Domains

- **Authentication & Authorization** — Uses NextAuth v4 (JWT session strategy) supporting Google OAuth, Google OneTap, and credentials flows. Role-based routing is secured client-side via route guards and server-side in `/src/proxy.ts`.
- **Real-Time Crowd Detection** — Processes location events (`geofence_enter`, `geofence_exit`, and `beacon_nearby`) via `/api/track/event` over a 5-minute rolling window. Groups users into 25m clusters to calculate gate crowd densities and telemetry confidence.
- **Egress Staggering & Planning** — Generates per-user departure times (`GET /api/track/plan`) using a weighted scored function (70% capacity avoidance, 30% walking ETA) and batch stagger assignments. Outputs are localized (Gemini-grounded or templates) in English, Spanish, French, Arabic, and Chinese.
- **Match Data & Simulation** — Integrates football-data.org / API-Football match feeds with high-speed caches, supported by a deterministic `LiveDemoEngine` that generates pseudorandom timelines for local drills.
- **AI Copilot (FanAssist)** — SSE-streaming chat interface (`/api/chat`) that answers fan questions grounded in active scoreboard telemetry, weather reports, and the user's specific egress plan.
- **Autonomous Operations Agent (AI Ops Agent)** — A backgroundTelemetry evaluation loop (`/api/admin/cron-ops-agent`) which checks gate densities and uses Gemini 2.5 Pro to autonomously apply gate limits or dispatch stewards when occupancy bounds exceed 85%.
- **Synthetic Scenario Simulator** — Translates natural language prompts into structured 60s training scenarios (densities, incident logs, alerts) to simulate emergency drills for stadium staff.
- **NVIDIA NIM Rate Limiter** — Enforces a budget of 20 requests per minute globally using `globalThis` caching to stay within free-tier limits.

---

## License

MIT — Created for the 2026 FIFA World Cup transit and operations hackathon.