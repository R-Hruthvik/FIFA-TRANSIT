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
