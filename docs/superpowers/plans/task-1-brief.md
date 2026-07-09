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
