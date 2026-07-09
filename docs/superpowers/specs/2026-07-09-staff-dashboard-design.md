# Design Specification: Staff Stadium Operations Dashboard

## 1. Overview
High-density, high-contrast administrative dashboard for stadium command centers, built in Next.js 16/React 19.

## 2. Layout Structure
- **Container**: `bg-zinc-950` widescreen grid.
- **Left Sidebar**: `LiveQueryTicker` (25% width).
- **Center Stage**: `SpatialHeatmap` (top, large SVG area) + `OperationalInsights` (bottom, summary card).

## 3. Components
### 3.1 `SpatialHeatmap`
- **Type**: Inline SVG quadrant grid.
- **Functionality**: Interactive filtering. Clicking a gate quadrant filters the `LiveQueryTicker` log by that gate.
- **Visuals**: Background colors mapping to congestion states (Green/Orange/Red).

### 3.2 `LiveQueryTicker`
- **Functionality**: Static list, new logs appended to the top.
- **Behavior**: Filterable by gate selection from the heatmap.

### 3.3 `OperationalInsights`
- **Functionality**: Automated tactical recommendations card.

## 4. Technical
- **State**: `useState`/`useEffect` for mock data handling.
- **Styling**: TailwindCSS utility classes, high-contrast colors (Slate/Zinc).
- **Path**: `src/app/staff/page.tsx`
