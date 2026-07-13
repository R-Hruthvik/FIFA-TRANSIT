### Task 3: Implement LiveQueryTicker

**Files:**
- Create: `src/components/LiveQueryTicker.tsx`
- Modify: `src/app/staff/page.tsx`

**Interfaces:**
- Consumes: `StaffDashboardLayout`
- Produces: `LiveQueryTicker` component (static list, filterable).

- [ ] **Step 1: Implement Ticker as a standalone component**

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

- [ ] **Step 2: Commit**

```bash
git add src/components/LiveQueryTicker.tsx src/app/staff/page.tsx
git commit -m "feat(staff): extract query ticker to component"
```
