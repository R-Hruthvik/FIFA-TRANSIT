# Demo Mode Realism Plan

## Current State
- Demo runs for 60 seconds (`DEMO_DURATION_MS`)
- 5 timeline snapshots with discrete jumps
- Basic gate metrics and telemetry
- Limited AI responses
- Match scoreboard shows "Simulated data" text

## Target State
- 10-minute realistic match-day simulation
- Smooth interpolated transitions between states
- Realistic crowd flow patterns
- Live match scoreboard with simulated events
- Dynamic fan queries and contextual AI responses
- Realistic transit data with delays, alerts, and resolutions

## Phase 1: Extended Timeline (Week 1)

### 1.1 Expand Demo Timeline
- Extend from 60s to 10 minutes (600,000ms)
- Create 20+ snapshots with realistic progression:
  - Pre-match arrival (0-2 min): Low congestion, gates opening
  - Kickoff rush (2-4 min): Medium congestion, peak arrival
  - Match time (4-8 min): Variable congestion, steady state
  - Half-time (8-9 min): Moderate movement, hub activity
  - Post-match (9-10 min): High congestion, egress planning

### 1.2 Smooth Interpolation
- Replace discrete jumps with interpolated values
- Gate metrics transition gradually (low → medium → high over 30s)
- Telemetry values change incrementally (wait times, gate status)
- Weather conditions evolve (clear → overcast → light rain)

## Phase 2: Realistic Data Simulation (Week 2)

### 2.1 Match Scoreboard Simulation
- Simulate live match events:
  - Goals (random intervals)
  - Cards (yellow/red)
  - Substitutions
  - Match minute progression
  - Half-time/Full-time transitions
- Show realistic team names and scores
- Display "DEMO MODE" badge instead of "Simulated data"

### 2.2 Telemetry Data
- Realistic gate capacity percentages (not just low/medium/high)
- Dynamic wait times (5-15 minutes with variations)
- Crowd density maps with heat gradients
- Transit shuttle locations and ETAs
- Weather data with realistic changes

### 2.3 Fan Query Stream
- Generate realistic fan questions based on current state:
  - "Where is Gate G3?"
  - "How long is the wait at Main Hub?"
  - "Is Gate G1 open?"
  - "Shuttle schedule to parking"
- Vary query frequency based on congestion level
- Show realistic timestamps and query patterns

## Phase 3: AI Response Enhancement (Week 3)

### 3.1 Contextual Responses
- AI responses change based on current demo state:
  - Low congestion: "All gates are operating normally"
  - Medium congestion: "Gate G3 is busy, consider Gate G1"
  - High congestion: "Critical congestion at Gate G3, staff deployed"
- Include specific details (times, locations, actions)
- Multi-turn conversation context

### 3.2 Response Streaming
- Simulate realistic typing delays
- Word-by-word streaming effect
- Variable response lengths based on query complexity

## Phase 4: Demo UX Improvements (Week 4)

### 4.1 Demo Control Panel
- Add demo progress indicator
- Show current demo phase (Pre-match, Kickoff, etc.)
- Allow pausing/resuming demo
- Demo speed control (1x, 2x, 5x)

### 4.2 Demo Mode Indicator
- Persistent "DEMO MODE" badge in header
- Amber/gold color scheme for demo elements
- Subtle animation to indicate simulation
- Clear distinction from live data

### 4.3 Demo Reset
- One-click demo restart
- Clear all cached demo data
- Reset to initial state

## Technical Implementation

### Data Structures
```typescript
interface DemoMatchEvent {
  timestamp: number;
  type: 'goal' | 'card' | 'substitution' | 'half_time' | 'full_time';
  team: 'home' | 'away';
  player?: string;
  minute: number;
}

interface DemoTelemetryPoint {
  timestamp: number;
  gates: GateStatus[];
  hubWaitTime: number;
  shuttlePosition: { lat: number; lng: number } | null;
  weather: WeatherCondition;
}
```

### State Machine
```
PRE_MATCH → KICKOFF_RUSH → MATCH_TIME → HALF_TIME → POST_MATCH
```

### Interpolation Functions
- Linear interpolation for gradual changes
- Easing functions for natural transitions
- Noise functions for realistic variation

## Success Metrics
- Demo feels like real match-day experience
- No obvious "fake data" indicators
- Smooth transitions between states
- Realistic timing and pacing
- Users can't distinguish demo from live data (intentionally)

## Files to Modify
- `src/lib/demo-data.ts` - Expand timeline and add interpolation
- `src/components/DemoController.tsx` - Add demo state machine
- `src/components/match/MatchScoreboard.tsx` - Realistic match simulation
- `src/components/FanHub.tsx` - Use interpolated demo data
- `src/components/StaffHub.tsx` - Use interpolated demo data
- `src/hooks/useChatStream.ts` - Contextual AI responses
- `src/components/AICopilotChat.tsx` - Streaming responses

## Priority
1. **High**: Extended timeline with smooth interpolation
2. **High**: Realistic match scoreboard simulation
3. **Medium**: Enhanced telemetry data
4. **Medium**: Contextual AI responses
5. **Low**: Demo UX improvements

## Estimated Effort
- Phase 1: 2-3 days
- Phase 2: 3-4 days
- Phase 3: 2-3 days
- Phase 4: 1-2 days
- **Total: 8-12 days**
