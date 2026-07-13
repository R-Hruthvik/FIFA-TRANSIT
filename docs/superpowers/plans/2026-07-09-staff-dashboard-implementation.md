# Staff Stadium Operations Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-density, interactive staff dashboard for stadium operations, featuring an interactive spatial heatmap and a real-time fan query ticker.

**Architecture:** Functional React components using local state for mock telemetry, arranged in a widescreen grid layout with high-contrast styling.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, TailwindCSS.

## Global Constraints

- **Theme**: Dark Slate (Tailwind: `bg-zinc-950`, `text-slate-100`).
- **Path**: `src/app/staff/page.tsx`.
- **Interactivity**: SpatialHeatmap quadrants filter the LiveQueryTicker log on click.
- **Ticker**: Static list, append new items to the top.

---

### Task 1: Setup Dashboard Layout

**Files:**
- Create: `src/app/staff/page.tsx`
- Test: `src/app/staff/page.test.tsx`

**Interfaces:**
- Produces: `StaffDashboardLayout` component (shell structure).

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from '@testing-library/react';
import Page from './page';

test('renders dashboard layout structure', () => {
  render(<Page />);
  expect(screen.getByRole('main')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/app/staff/page.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Dashboard shell**

```typescript
export default function StaffDashboard() {
  return (
    <main className="h-screen w-screen bg-zinc-950 text-slate-100 p-4 grid grid-cols-4 gap-4">
      <div className="col-span-1 border border-slate-700 p-4">Ticker</div>
      <div className="col-span-3 border border-slate-700 p-4">Center Stage</div>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/app/staff/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/staff/page.tsx
git commit -m "feat(staff): initialize dashboard layout"
```

### Task 2: Implement SpatialHeatmap

**Files:**
- Modify: `src/app/staff/page.tsx`

**Interfaces:**
- Consumes: `StaffDashboardLayout`
- Produces: `SpatialHeatmap` component (inline SVG, interactive quadrants).

- [ ] **Step 1: Implement SpatialHeatmap with interactive quadrants**

```typescript
const Quadrant = ({ label, status, onClick }: { label: string; status: string; onClick: () => void }) => {
  const colors = { Smooth: 'bg-green-900', Advised: 'bg-orange-900', Critical: 'bg-red-900' };
  return (
    <div className={`p-4 border ${colors[status as keyof typeof colors]} cursor-pointer`} onClick={onClick}>
      {label}
    </div>
  );
};

export const SpatialHeatmap = ({ onGateClick }: { onGateClick: (gate: string) => void }) => (
  <div className="grid grid-cols-2 gap-2">
    <Quadrant label="Gate A" status="Smooth" onClick={() => onGateClick('Gate A')} />
    <Quadrant label="Gate B" status="Advised" onClick={() => onGateClick('Gate B')} />
    <Quadrant label="Gate C" status="Critical" onClick={() => onGateClick('Gate C')} />
    <Quadrant label="Gate D" status="Smooth" onClick={() => onGateClick('Gate D')} />
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/app/staff/page.tsx
git commit -m "feat(staff): add spatial heatmap component"
```

### Task 3: Implement LiveQueryTicker

**Files:**
- Modify: `src/app/staff/page.tsx`

**Interfaces:**
- Consumes: `SpatialHeatmap`
- Produces: `LiveQueryTicker` component (static list, filterable).

- [ ] **Step 1: Implement Ticker with filtering state**

```typescript
'use client';
import { useState } from 'react';

const initialQueries = [
  { id: 1, gate: 'Gate A', content: 'Entry slow', time: '10:00' },
  { id: 2, gate: 'Gate C', content: 'Blocked aisle', time: '10:05' },
];

export const LiveQueryTicker = ({ gateFilter }: { gateFilter: string | null }) => {
  const [queries] = useState(initialQueries);
  const filtered = gateFilter ? queries.filter(q => q.gate === gateFilter) : queries;
  return (
    <ul>
      {filtered.map(q => <li key={q.id}>{q.time} - {q.gate}: {q.content}</li>)}
    </ul>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/staff/page.tsx
git commit -m "feat(staff): add filterable query ticker"
```

### Task 4: Integrate and Polish

**Files:**
- Modify: `src/app/staff/page.tsx`

**Interfaces:**
- Consumes: `StaffDashboardLayout`, `SpatialHeatmap`, `LiveQueryTicker`.

- [ ] **Step 1: Integrate components in page**

(Full component assembly in `src/app/staff/page.tsx`)

- [ ] **Step 2: Commit**

```bash
git add src/app/staff/page.tsx
git commit -m "feat(staff): integrate dashboard components"
```
