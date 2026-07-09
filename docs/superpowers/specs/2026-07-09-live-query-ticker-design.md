# Design: LiveQueryTicker Extraction

## Purpose
Extract the Live Query Ticker into a standalone, reusable component and ensure it follows the specified implementation.

## Architecture
- `src/components/LiveQueryTicker.tsx`: Standalone functional component.
- Data: Static `initialQueries` array.
- Props: `{ gateFilter: string | null }`.

## Implementation Details
- Replace the existing `src/components/LiveQueryTicker.tsx` with the new implementation.
- `src/app/staff/page.tsx`: Remains the consumer.

## Testing
- Verify component renders with and without filter.
- Run existing tests for ticker.
