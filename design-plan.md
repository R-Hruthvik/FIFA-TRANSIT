# Implementation Plan: SpatialHeatmap Gate Filtering

## Design Overview
1. **`StaffDashboard` (src/app/staff/page.tsx)**:
   - Add `gateFilter` state: `const [gateFilter, setGateFilter] = useState<string | null>(null);`.
   - Update `handleGateClick`: `(gate) => setGateFilter(prev => prev === gate ? null : gate)`.
   - Pass `gateFilter` to `LiveQueryTicker`.
   
2. **`LiveQueryTicker` (src/components/LiveQueryTicker.tsx)**:
   - Create new component.
   - Props: `gateFilter: string | null`.
   - Implementation: Display a mock list of log items. Filter items by `gateFilter`. If `gateFilter` is null, show all.

3. **`SpatialHeatmap` (src/components/SpatialHeatmap.tsx)**:
   - (No changes needed if `onGateClick` is already implemented).

## Approach
- Implement `LiveQueryTicker` first.
- Integrate into `StaffDashboard`.
- Add basic test for filtering behavior.
