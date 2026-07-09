# LiveQueryTicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract LiveQueryTicker into a standalone, reusable component.

**Architecture:** Replace the existing `LiveQueryTicker` component with the specified implementation.

**Tech Stack:** React, TypeScript.

## Global Constraints

- Component must be functional and use `'use client'`.
- Data must be static `initialQueries` array as specified in the task brief.
- Component signature must be `({ gateFilter }: { gateFilter: string | null })`.

---

### Task 1: Implement LiveQueryTicker

**Files:**
- Modify: `src/components/LiveQueryTicker.tsx`
- Test: `src/components/LiveQueryTicker.test.tsx`

**Interfaces:**
- Produces: `LiveQueryTicker` component.

- [ ] **Step 1: Write failing test**

```typescript
import { render, screen } from '@testing-library/react';
import { LiveQueryTicker } from './LiveQueryTicker';

test('renders ticker with initial queries', () => {
  render(<LiveQueryTicker gateFilter={null} />);
  expect(screen.getByText(/Gate A/)).toBeInTheDocument();
  expect(screen.getByText(/Gate C/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/LiveQueryTicker.test.tsx`
Expected: FAIL due to component update

- [ ] **Step 3: Update component implementation**

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
    <ul className="space-y-2">
      {filtered.map(q => <li key={q.id} className="border-b border-slate-700 p-2">{q.time} - {q.gate}: {q.content}</li>)}
    </ul>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/LiveQueryTicker.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/LiveQueryTicker.tsx src/components/LiveQueryTicker.test.tsx
git commit -m "feat(staff): extract query ticker to component"
```
