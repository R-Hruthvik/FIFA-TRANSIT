# Graph Report - .  (2026-07-14)

## Corpus Check
- 144 files · ~145,439 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 672 nodes · 1071 edges · 37 communities (29 shown, 8 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 143 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Database Seeding and Routes
- Fan Egress Portal UI Components
- Dashboard Page Layout
- LLM Configuration & Trimmer
- Package Dependencies & DevConfig
- Database & UI Styling Packages
- Agent UI CLI and Orchestration
- Tournament Suite Landing States
- NextJS Build Output Types
- System Prompt Posting Route
- Session Management Utility
- AI Copilot Interactions
- Landing States & Egress Portal
- Video Script & Heatmap Plans
- UI Components Layout Config
- Base Model Tool Schemas
- Telemetry & Egress Portal Tab
- Gates Infrastructure & Status
- NextJS Layout & Fonts
- Stadium Dashboard Layout Panels
- SSE Polling & Chat Fixes
- Staff Alerts & Dashboard Components
- Live Pulse & Heatmap Widgets
- Egress Staggering & Tracking System
- Fan Deferral Portal UI
- Tournament Logistics Actions
- World Cup Ops Command Center
- ESLint Configuration
- NextJS Configuration
- PostCSS Configuration
- Copilot Caveman Rules
- Agents Project Configuration
- File SVG Assets
- Globe SVG Assets
- Window SVG Assets

## God Nodes (most connected - your core abstractions)
1. `AgentTUIApp` - 26 edges
2. `Orchestrator` - 24 edges
3. `compilerOptions` - 16 edges
4. `SessionManager` - 15 edges
5. `GateCrowd` - 14 edges
6. `aggregateCrowd()` - 13 edges
7. `Fan Egress Portal` - 12 edges
8. `LiveQueryTicker()` - 11 edges
9. `GateMetrics` - 10 edges
10. `StadiumTelemetry` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Fan AI Copilot Chat Interface` --semantically_similar_to--> `AICopilotChat()`  [INFERRED] [semantically similar]
  docs/screenshots/fan-tab.png → src/components/AICopilotChat.tsx
- `Fan Egress Portal Layout` --conceptually_related_to--> `FanHub()`  [INFERRED]
  .playwright-mcp/page-2026-07-13T05-03-32-229Z.png → src/components/FanHub.tsx
- `Fan Tab Screenshot` --references--> `FanHub()`  [INFERRED]
  docs/screenshots/fan-tab.png → src/components/FanHub.tsx
- `Fan Egress Portal Screen` --references--> `LiveQueryTicker()`  [INFERRED]
  .playwright-mcp/page-2026-07-13T05-03-32-229Z.png → src/components/LiveQueryTicker.tsx
- `Fan Query Stream UI` --references--> `LiveQueryTicker()`  [INFERRED]
  docs/screenshots/staff-enforcement-scrolled.png → src/components/LiveQueryTicker.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fan Egress Portal UI Progression** — _playwright_mcp_page_2026_07_12t14_56_35_421z_fan_egress_portal, _playwright_mcp_page_2026_07_12t15_00_15_289z_fan_egress_portal, _playwright_mcp_page_2026_07_12t15_02_40_111z_fan_egress_portal_query, _playwright_mcp_page_2026_07_12t15_11_31_501z_fan_egress_portal, _playwright_mcp_page_2026_07_12t15_17_23_733z_fan_egress_portal, _playwright_mcp_page_2026_07_12t17_04_30_940z_fan_egress_portal_live, _playwright_mcp_page_2026_07_12t17_05_15_178z_fan_egress_portal_live [INFERRED 0.85]
- **Staff Ops Deck UI Progression** — _playwright_mcp_page_2026_07_12t15_04_19_892z_staff_ops_deck, _playwright_mcp_page_2026_07_12t15_22_03_756z_staff_ops_deck, _playwright_mcp_page_2026_07_12t17_06_06_611z_staff_ops_deck_congested [INFERRED 0.85]
- **AI Copilot Query Flow Sequence** — _playwright_mcp_page_2026_07_13t05_20_18_270z_state, _playwright_mcp_page_2026_07_13t05_20_54_715z_state, _playwright_mcp_page_2026_07_13t05_21_16_589z_state, _playwright_mcp_page_2026_07_13t05_21_39_939z_state, _playwright_mcp_page_2026_07_13t05_21_58_331z_state, _playwright_mcp_page_2026_07_13t05_22_10_446z_state, _playwright_mcp_page_2026_07_13t05_22_21_463z_state, _playwright_mcp_page_2026_07_13t05_22_38_116z_state [INFERRED 0.85]
- **Emergency Steward Directions Alert Flow** — _playwright_mcp_page_2026_07_13t15_11_11_052z_state, _playwright_mcp_page_2026_07_13t15_32_41_630z_state, _playwright_mcp_page_2026_07_13t15_33_21_710z_state [INFERRED 0.95]
- **Staff Dashboard Implementation Flow** — docs_superpowers_plans_2026_07_09_staff_dashboard_implementation_md, docs_superpowers_plans_2026_07_09_spatial_heatmap_implementation_md, docs_superpowers_plans_2026_07_09_live_query_ticker_plan_md, src_app_staff_page_staffdashboard [EXTRACTED 1.00]
- **Superpowers Development Tasks 1-3** — docs_superpowers_plans_task_1_brief_md, docs_superpowers_plans_task_1_report_md, docs_superpowers_plans_task_2_brief_md, docs_superpowers_plans_task_2_report_md, docs_superpowers_plans_task_3_brief_md [EXTRACTED 1.00]
- **Egress Design Premises (D1, D3, D9, D10)** — concept_d1_real_sources, concept_d3_events_not_gps, concept_d9_confidence_gating, concept_d10_capacity_stagger [INFERRED 0.95]
- **Fan Egress Portal View Components** — src_components_fanhub_fanhub, src_components_livestatuscards_livestatuscards, src_components_livequeryticker_livequeryticker, src_components_aicopilotchat_aicopilotchat [INFERRED 0.95]
- **Stadium Egress Operations Dashboard Components** — _playwright_mcp_page_2026_07_13t05_04_09_070z_live_stadium_pulse, _playwright_mcp_page_2026_07_13t05_04_09_070z_gate_performance_metrics, _playwright_mcp_page_2026_07_13t05_04_09_070z_fan_query_stream, _playwright_mcp_page_2026_07_13t05_04_09_070z_tactical_insights [EXTRACTED 1.00]
- **Matchday Status Indicators** — _playwright_mcp_page_2026_07_13t05_22_53_739z_gate_status, _playwright_mcp_page_2026_07_13t05_22_53_739z_transit_network_status, _playwright_mcp_page_2026_07_13t05_22_53_739z_environment_status [EXTRACTED 1.00]
- **Tournament Logistics Actions** — docs_screenshots_fan_egress_security_status, docs_screenshots_fan_egress_gate_capacity, docs_screenshots_fan_egress_transit_alerts [EXTRACTED 1.00]
- **Tournament Logistics Actions** — docs_screenshots_fan_tab_security_status, docs_screenshots_fan_tab_gate_capacity, docs_screenshots_fan_tab_transit_alerts [EXTRACTED 1.00]
- **Egress Operations Dashboard Integration** — docs_screenshots_staff_alerts_full_spatial_congestion_heatmap, docs_screenshots_staff_alerts_full_tactical_insights, docs_screenshots_staff_alerts_full_enforcement_alerts [INFERRED 0.85]
- **Staff Ops Deck Dashboard UI Components** — docs_screenshots_staff_enforcement_panel_live_stadium_pulse, docs_screenshots_staff_enforcement_panel_spatial_congestion_heatmap, docs_screenshots_staff_enforcement_panel_tactical_insights [EXTRACTED 1.00]
- **Staff Ops Deck Layout Components** — docs_screenshots_staff_full_page_live_stadium_pulse, docs_screenshots_staff_full_page_spatial_congestion_heatmap, docs_screenshots_staff_full_page_fan_query_stream, docs_screenshots_staff_full_page_tactical_insights, docs_screenshots_staff_full_page_enforcement_alerts [EXTRACTED 1.00]

## Communities (37 total, 8 thin omitted)

### Community 0 - "Database Seeding and Routes"
Cohesion: 0.05
Nodes (58): GATES, main(), GET(), checkRateLimit(), POST(), RateBucket, rateBuckets, validateEvent() (+50 more)

### Community 1 - "Fan Egress Portal UI Components"
Cohesion: 0.06
Nodes (44): Fan Egress Portal Screen, Fan Egress Portal Layout, Fan AI Copilot Chat Interface, Gate Capacity Action Button, Fan Tab Screenshot, Security Status Action Button, Transit Alerts Action Button, gateLabels (+36 more)

### Community 2 - "Dashboard Page Layout"
Cohesion: 0.06
Nodes (41): TabTriggerProps, DemoContext, DemoContextValue, DemoModeButton(), DemoProvider(), useDemoMode(), GATE_POSITIONS, HeatmapBaseProps (+33 more)

### Community 3 - "LLM Configuration & Trimmer"
Cohesion: 0.07
Nodes (29): ConfigProvider, ContextTrimmer, _estimate_message_tokens(), estimate_tokens(), _get_context_limit(), Any, Token Context Trimmer — sliding-window message pruner for LiteLLM conversations., Trim message history to stay within context budget.          Pinned messages (ne (+21 more)

### Community 4 - "Package Dependencies & DevConfig"
Cohesion: 0.05
Nodes (40): eslint, eslint-config-next, jest, jest-environment-jsdom, devDependencies, eslint, eslint-config-next, jest (+32 more)

### Community 5 - "Database & UI Styling Packages"
Cohesion: 0.06
Nodes (35): class-variance-authority, clsx, @google/generative-ai, lucide-react, mongodb, motion, next, dependencies (+27 more)

### Community 6 - "Agent UI CLI and Orchestration"
Cohesion: 0.09
Nodes (11): App, ComposeResult, AgentTUIApp, load_resume_state(), parse_args(), Any, Agentic Framework TUI — main entry point.  Upgraded to rich, async-driven multim, Load session state for resume if requested. (+3 more)

### Community 7 - "Tournament Suite Landing States"
Cohesion: 0.11
Nodes (32): Fan Egress Portal, Fan Egress Portal - Active Chat Assist State, Landing Page View, FIFA Tournament Management Suite, FIFA Tournament Management Suite Initial Landing Page State, Fan Egress Portal, Fan Egress Portal - Initial Loaded State, Live Stadium Pulse Panel (+24 more)

### Community 8 - "NextJS Build Output Types"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 9 - "System Prompt Posting Route"
Cohesion: 0.10
Nodes (16): buildSystemPrompt(), Message, POST(), GET(), GET(), GET(), DEFAULT_TELEMETRY, getLatestLogs() (+8 more)

### Community 10 - "Session Management Utility"
Cohesion: 0.12
Nodes (19): Path, _compute_session_summary(), _ensure_session_dir(), _generate_session_filename(), Any, Session Manager — save/load agent session state for resume capability.  Persists, Load the most recent session state.          Returns:             Parsed state d, Load a specific session file by path. (+11 more)

### Community 11 - "AI Copilot Interactions"
Cohesion: 0.26
Nodes (23): Fan Support Assistant, Fan Support Assistant, AI Copilot User Interaction, Fan Support Assistant, Fan Egress Portal - Copilot Chat Inputting State, AI Copilot Query Execution, Fan Support Assistant, Fan Egress Portal - Copilot Chat Querying Disabled State (+15 more)

### Community 12 - "Landing States & Egress Portal"
Cohesion: 0.16
Nodes (22): Landing Page State, FIFA Tournament Management Suite, Landing Page State, Fan Egress Portal, Fan Support Assistant, Fan Egress Portal Dashboard, Fan Egress Portal Assistant Response, Staff Ops Deck (+14 more)

### Community 13 - "Video Script & Heatmap Plans"
Cohesion: 0.14
Nodes (22): Demo Video Script, SpatialHeatmap Gate Filtering Implementation Plan, Staff Enforcement Dashboard, Fan Query Stream UI, Gate Capacity Enforcement UI, Low Confidence Routing Deferral, Staff Enforcement Scrolled Screenshot, LiveQueryTicker Implementation Plan (+14 more)

### Community 14 - "UI Components Layout Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 15 - "Base Model Tool Schemas"
Cohesion: 0.15
Nodes (12): BaseModel, ExecuteBashArgs, get_schema_description(), ListVaultArgs, Pydantic Tool Argument Schemas — validation models for all framework tools.  Eac, Get human-readable schema description for a tool.      Useful for injecting sche, Arguments for the read_file tool., Arguments for the write_file tool. (+4 more)

### Community 16 - "Telemetry & Egress Portal Tab"
Cohesion: 0.17
Nodes (12): Dark Theme UI Aesthetic with High-Contrast Green Accents, Environment Status Indicator Card, Fan Egress Portal Tab, Fan Query Stream Logs, Fan Support Assistant Chat Interface, Gate Status Indicator Card, Match Details Header Component, Matchday Status Dashboard (+4 more)

### Community 17 - "Gates Infrastructure & Status"
Cohesion: 0.24
Nodes (11): Fan Egress Portal Link, Gate A, Gate B, Gate C, Gate D, Staff Enforcement Panel Screenshot, Live Stadium Pulse, Main Hub (+3 more)

### Community 18 - "NextJS Layout & Fonts"
Cohesion: 0.25
Nodes (6): geistMono, geistSans, metadata, GuidedWalkthrough(), Step, STEPS

### Community 19 - "Stadium Dashboard Layout Panels"
Cohesion: 0.29
Nodes (7): Dark Mode Stadium Dashboard Design, Fan Egress Portal Dashboard, Fan Query Stream Panel, Gate Performance Metrics Panel, Live Stadium Pulse Panel, Match Details Header Component, Tactical Insights Panel

### Community 20 - "SSE Polling & Chat Fixes"
Cohesion: 0.33
Nodes (6): Chat Input Closure Bug Fix, Heatmap Click-to-Filter, SSE First with Polling Fallback, Next.js Logo, Vercel Logo, README

### Community 21 - "Staff Alerts & Dashboard Components"
Cohesion: 0.53
Nodes (6): Enforcement and Alerts Component, Fan Query Stream Component, Staff Alerts Full Screenshot, Spatial Congestion Heatmap Component, Staff Ops Deck UI Layout, Tactical Insights Component

### Community 22 - "Live Pulse & Heatmap Widgets"
Cohesion: 0.47
Nodes (6): Enforcement & Alerts Widget, Fan Query Stream Widget, Live Stadium Pulse Widget, Spatial Congestion Heatmap Widget, Staff Ops Deck Dashboard, Tactical Insights Widget

### Community 23 - "Egress Staggering & Tracking System"
Cohesion: 0.40
Nodes (5): D10 - Capacity-Based Egress Staggering, D1 - Real Sources Ingestion, D3 - Event-Based Tracking over GPS, D9 - Confidence Gating & Privacy, Production Real-Time Tracking System

### Community 24 - "Fan Deferral Portal UI"
Cohesion: 0.40
Nodes (5): Fan Egress Portal, Fan Query Stream, Fan Deferral UI Screenshot, Server-Sent Events, Staff Ops Deck

### Community 25 - "Tournament Logistics Actions"
Cohesion: 0.40
Nodes (5): Gate Capacity Action, Fan Egress Screenshot, Security Status Action, Tournament Logistics Assistant, Transit Alerts Action

### Community 26 - "World Cup Ops Command Center"
Cohesion: 0.67
Nodes (4): Command Center, Landing Page Screenshot, FIFA Tournament Management Suite, 2026 World Cup Operations

## Knowledge Gaps
- **194 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+189 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StadiumTelemetry` connect `Dashboard Page Layout` to `System Prompt Posting Route`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Orchestrator` connect `LLM Configuration & Trimmer` to `Session Management Utility`, `Agent UI CLI and Orchestration`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `LiveQueryTicker()` connect `Video Script & Heatmap Plans` to `Fan Egress Portal UI Components`, `Dashboard Page Layout`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `AgentTUIApp` (e.g. with `Orchestrator` and `SessionManager`) actually correct?**
  _`AgentTUIApp` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Orchestrator` (e.g. with `AgentTUIApp` and `ConfigProvider`) actually correct?**
  _`Orchestrator` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _194 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Database Seeding and Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._