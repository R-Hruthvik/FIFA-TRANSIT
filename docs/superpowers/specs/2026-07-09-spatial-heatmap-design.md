# SpatialHeatmap Design

## Overview
Implement an interactive `SpatialHeatmap` component for the stadium operations dashboard. It displays the stadium layout in four quadrants, each representing a gate (A, B, C, D) with a status indicator (Smooth, Advised, Critical).

## Component Structure
- `SpatialHeatmap`: Main container, grid-based layout.
- `Quadrant`: Sub-component, renders individual gate information and handles interaction.

## Interaction
- Each quadrant is clickable.
- `onClick` triggers `onGateClick(gateName)`.

## Visual Design
- Layout: 2x2 grid.
- Styling (Tailwind):
    - Background colors based on status:
        - Smooth: `bg-green-900`
        - Advised: `bg-orange-900`
        - Critical: `bg-red-900`
    - Container: `grid grid-cols-2 gap-2`.

## Implementation Details
- Component file: `src/components/SpatialHeatmap.tsx`
- Integration: Import into `src/app/staff/page.tsx` within the Center Stage section.
