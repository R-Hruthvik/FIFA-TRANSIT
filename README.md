# FIFA Command Center — 2026 World Cup Transit Management

![Status](https://img.shields.io/badge/status-hackathon_ready-emerald)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

**FIFA Command Center** is a full-stack transit management dashboard built for the 2026 FIFA World Cup. It unifies real-time stadium operations, fan engagement, AI-powered assistance, and spatial congestion monitoring into a single control center — designed for hackathon speed and production polish.

---

## 🎯 What It Does

### For Staff Operators
- **Live Stadium Pulse** — Gate status, transit hub wait times, weather advisories in real time
- **Spatial Congestion Heatmap** — Three interchangeable visualizations (SVG stadium, thermal grid, geometric map)
- **Fan Query Stream** — SSE-powered live ticker with gate filtering and polling fallback
- **Tactical Insights** — Dynamic, severity-ranked operational recommendations
- **AI Copilot** — Dual-provider AI (NVIDIA NIM primary, Gemini fallback) with streaming responses

### For Matchday Fans
- **Personal Status** — Nearest gate, transit hub wait times, weather at a glance
- **AI Support Assistant** — Encrypted chat for tournament logistics
- **Live Query Stream** — Real-time stadium query updates

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2 (App Router, Turbopack) |
| **Language** | TypeScript (strict mode) |
| **Runtime** | React 19 |
| **Database** | MongoDB Atlas with connection caching |
| **AI** | NVIDIA NIM (Llama 3.1 70B) + Gemini 2.0 Flash fallback |
| **Real-Time** | Server-Sent Events (SSE) with polling fallback |
| **UI** | shadcn/ui + Tailwind CSS |
| **Animation** | Motion (Framer Motion) |
| **Icons** | Phosphor Icons |
| **Deploy** | Vercel |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas (or local instance)
- NVIDIA NIM API key, Gemini API key

### Installation

```bash
# Clone
git clone <your-repo-url>
cd fifa-transit-app

# Install
npm install

# Environment
cp .env.example .env.local
# Fill in MONGODB_URI, NVIDIA_NIM_API_KEY, GEMINI_API_KEY

# Dev server (Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```env
MONGODB_URI=your_mongodb_connection_string
NVIDIA_NIM_API_KEY=your_nvidia_nim_key
GEMINI_API_KEY=your_gemini_key
MONGODB_DB=stadium_ops
MONGODB_TELEMETRY_COLLECTION=telemetry
MONGODB_LOGS_COLLECTION=query_logs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── chat/route.ts       # Dual-provider AI chat
│   │   ├── fan/
│   │   │   ├── queries/        # Query logging + SSE stream
│   │   │   └── page.tsx        # Fan portal
│   │   ├── og/route.ts         # Dynamic OG image (SVG)
│   │   ├── staff/
│   │   │   └── metrics/        # Staff metrics API
│   │   └── telemetry/          # Live telemetry API
│   ├── layout.tsx              # Root layout + OG meta
│   ├── page.tsx                # Landing + demo controller
│   └── staff/page.tsx          # Staff dashboard
├── components/
│   ├── StaffHub.tsx            # Staff dashboard shell
│   ├── FanHub.tsx              # Fan portal shell
│   ├── LiveQueryTicker.tsx     # SSE + polling query stream
│   ├── LiveStatusCards.tsx     # Telemetry status cards
│   ├── OperationalInsights.tsx # Dynamic tactical insights
│   ├── AICopilotChat.tsx       # Staff AI chat
│   ├── HeatmapSelector.tsx     # Heatmap variant picker
│   ├── heatmap/                # Heatmap visualization variants
│   │   ├── StadiumSVG.tsx      # SVG stadium layout
│   │   ├── ThermalGrid.tsx     # 2×2 thermal cards
│   │   └── StadiumMap.tsx      # Geometric floor plan
│   ├── DemoController.tsx      # Demo mode context + toggle
│   └── GuidedWalkthrough.tsx   # 5-step onboarding tour
├── hooks/
│   └── useChatStream.ts        # Chat streaming hook (useRef guard)
├── lib/
│   ├── db.ts                   # MongoDB connection cache
│   └── demo-data.ts            # Scripted demo timeline
└── types/
    └── telemetry.ts            # TypeScript interfaces
```

---

## ✨ Key Features & Fixes

### Bug Fixes
1. **Chat Input Closure Bug** — `useCallback` was capturing stale `isLoading` state. Fixed with `useRef` guard pattern + 30s timeout safety net in `useChatStream.ts`
2. **Hardcoded Insights** — `OperationalInsights` was static. Now accepts `GateMetrics` prop and generates dynamic, severity-ranked insights

### Real-Time Streaming
- **SSE First, Polling Fallback** — `LiveQueryTicker` tries `EventSource` for live updates, falls back to 5s polling on failure
- **3-second connection timeout** — If SSE doesn't connect, automatically starts polling
- **Deduplication** — Logs deduplicated by `_id`, capped at 100 entries

### Heatmap System
- **3 Variants**: `StadiumSVG` (perimeter layout), `ThermalGrid` (2×2 cards), `StadiumMap` (geometric floor plan)
- **Click-to-filter** — Click any gate to filter the query stream
- **localStorage persistence** — Remembers variant preference across sessions

### Demo Mode
- **60-second scripted demo** — Cycles through realistic matchday data snapshots
- **Pre-recorded AI responses** — Contextual answers for security, capacity, transit queries
- **Auto-dismiss** — Demo resets after 60 seconds

### Guided Walkthrough
- **5-step onboarding** — Welcome → Fan Portal → Staff Deck → AI Copilot → Heatmap
- **Element highlighting** — Walks users through each major section
- **localStorage** — Remembers completion, only shows once

### Social Sharing
- **Dynamic OG image** — SVG-generated at `/api/og` with FIFA branding
- **Twitter Card** — `summary_large_image` with full metadata
- **Open Graph** — Complete OG tags for Facebook, LinkedIn, Slack previews

---

## 🎛️ Development

### Scripts
```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run lint      # ESLint
npm test          # Jest tests
```

### Architecture Patterns
- **Server-Sent Events** for real-time data (not WebSockets) — lighter weight, works with CDN
- **useRef for stale closures** — Prevents race conditions in streaming hooks
- **Component map pattern** — Heatmap variants switched via `Record<HeatmapVariant, Component>`
- **React Context for cross-cutting state** — Demo mode available everywhere without prop drilling
- **Connection caching** — MongoDB client reused across requests via singleton promise

---

## 🚢 Deployment

### Vercel (Recommended)
```bash
# Connect your GitHub repo to Vercel
# Set environment variables in Vercel dashboard
# Auto-deploys on push to main
```

### Manual Build
```bash
npm run build
npm start
```

---

## 🏆 Hackathon Submission Checklist

- [x] Live deployed URL
- [x] Public GitHub repository
- [x] Social media post ready (OG image + meta tags)
- [x] Demo mode for judges
- [x] Feature-complete (11/11 items)
- [x] TypeScript strict mode passing

---

## 📝 Notes

Built with urgency and craft for the **FIFA World Cup 2026 Hackathon** (July 2026). Every component ships with error boundaries, graceful degradation, and zero-config deployment.

---

## License

MIT — built for the beautiful game ⚽
