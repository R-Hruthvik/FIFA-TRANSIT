# SpatialHeatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement interactive SpatialHeatmap component and integrate into Staff Dashboard.

**Architecture:** Create a functional `SpatialHeatmap` component in `src/components` and import it into the main dashboard page. Use Tailwind for styling.

**Tech Stack:** React, Tailwind CSS.

## Global Constraints

- Component must have four interactive quadrants.
- Clicking a quadrant must call `onGateClick(gateName)`.
- Use Tailwind for colors (Green/Orange/Red based on status).
- TDD required.

---

### Task 1: Implement SpatialHeatmap

**Files:**
- Create: `src/components/SpatialHeatmap.tsx`
- Test: `src/components/SpatialHeatmap.test.tsx`

**Interfaces:**
- Produces: `SpatialHeatmap` component (interface `{ onGateClick: (gate: string) => void }`)

- [ ] **Step 1: Write the failing test for SpatialHeatmap**

```tsx
// src/components/SpatialHeatmap.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SpatialHeatmap } from './SpatialHeatmap';

test('renders all gates and handles click', () => {
  const onGateClick = jest.fn();
  render(<SpatialHeatmap onGateClick={onGateClick} />);
  
  const gateA = screen.getByText('Gate A');
  fireEvent.click(gateA);
  
  expect(onGateClick).toHaveBeenCalledWith('Gate A');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/SpatialHeatmap.test.tsx`
Expected: FAIL ("SpatialHeatmap not defined")

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/SpatialHeatmap.tsx
import React from 'react';

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/SpatialHeatmap.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SpatialHeatmap.tsx src/components/SpatialHeatmap.test.tsx
git commit -m "feat(component): add SpatialHeatmap"
```

---

### Task 2: Integrate SpatialHeatmap into Staff Dashboard

**Files:**
- Modify: `src/app/staff/page.tsx`

**Interfaces:**
- Consumes: `SpatialHeatmap`

- [ ] **Step 1: Import and add to dashboard**

```tsx
// src/app/staff/page.tsx
import { SpatialHeatmap } from '@/components/SpatialHeatmap';

export default function StaffDashboard() {
  const handleGateClick = (gate: string) => console.log('Clicked', gate);
  return (
    <main className="h-screen w-screen bg-zinc-950 text-slate-100 p-4 grid grid-cols-4 gap-4">
      <div className="col-span-1 border border-slate-700 p-4">Ticker</div>
      <div className="col-span-3 border border-slate-700 p-4">
        <SpatialHeatmap onGateClick={handleGateClick} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/staff/page.tsx
git commit -m "feat(staff): integrate spatial heatmap"
```
