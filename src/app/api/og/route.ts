import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d4a843"/>
      <stop offset="50%" stop-color="#f0d078"/>
      <stop offset="100%" stop-color="#d4a843"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="field" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#065f46" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#022c22" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#065f46" stroke-width="0.5" opacity="0.3"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- Center field glow -->
  <circle cx="600" cy="280" r="220" fill="url(#field)"/>

  <!-- Decorative ring -->
  <circle cx="600" cy="280" r="180" fill="none" stroke="#d4a843" stroke-width="1" opacity="0.15"/>
  <circle cx="600" cy="280" r="200" fill="none" stroke="#d4a843" stroke-width="0.5" opacity="0.1"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#gold)"/>

  <!-- Bottom accent bar -->
  <rect x="0" y="626" width="1200" height="4" fill="url(#gold)"/>

  <!-- FIFA 2026 Text -->
  <text x="600" y="100" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" letter-spacing="8" fill="#d4a843" opacity="0.9">FIFA WORLD CUP 2026</text>

  <!-- Trophy Icon (simplified) -->
  <g transform="translate(550, 130)" filter="url(#glow)">
    <path d="M50 0 L65 20 L65 45 Q65 55 50 55 Q35 55 35 45 L35 20 Z" fill="url(#gold)" opacity="0.9"/>
    <rect x="35" y="55" width="30" height="8" rx="2" fill="#d4a843" opacity="0.7"/>
    <rect x="42" y="63" width="16" height="6" rx="1" fill="#d4a843" opacity="0.5"/>
    <path d="M35 15 Q15 15 15 30 Q15 42 35 40" fill="none" stroke="#d4a843" stroke-width="2" opacity="0.6"/>
    <path d="M65 15 Q85 15 85 30 Q85 42 65 40" fill="none" stroke="#d4a843" stroke-width="2" opacity="0.6"/>
  </g>

  <!-- Main Title -->
  <text x="600" y="240" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" letter-spacing="2" fill="white">FIFA COMMAND</text>
  <text x="600" y="298" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" letter-spacing="2" fill="white">CENTER</text>

  <!-- Gold underline -->
  <rect x="350" y="315" width="500" height="3" rx="1.5" fill="url(#gold)" opacity="0.8"/>

  <!-- Subtitle -->
  <text x="600" y="355" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="400" letter-spacing="4" fill="#a7f3d0" opacity="0.8">TRANSIT MANAGEMENT DASHBOARD</text>

  <!-- Gate indicators -->
  <g transform="translate(0, 0)">
    <rect x="350" y="420" width="100" height="50" rx="8" fill="#064e3b" stroke="#d4a843" stroke-width="1" opacity="0.6"/>
    <text x="400" y="443" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" letter-spacing="2" fill="#d4a843">GATE A</text>
    <text x="400" y="460" text-anchor="middle" font-family="monospace" font-size="10" fill="#6ee7b7">NOMINAL</text>
  </g>
  <g transform="translate(0, 0)">
    <rect x="470" y="420" width="100" height="50" rx="8" fill="#064e3b" stroke="#d4a843" stroke-width="1" opacity="0.6"/>
    <text x="530" y="443" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" letter-spacing="2" fill="#d4a843">GATE B</text>
    <text x="530" y="460" text-anchor="middle" font-family="monospace" font-size="10" fill="#6ee7b7">NOMINAL</text>
  </g>
  <g transform="translate(0, 0)">
    <rect x="590" y="420" width="100" height="50" rx="8" fill="#064e3b" stroke="#d4a843" stroke-width="1" opacity="0.6"/>
    <text x="650" y="443" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" letter-spacing="2" fill="#d4a843">GATE C</text>
    <text x="650" y="460" text-anchor="middle" font-family="monospace" font-size="10" fill="#6ee7b7">NOMINAL</text>
  </g>
  <g transform="translate(0, 0)">
    <rect x="710" y="420" width="100" height="50" rx="8" fill="#064e3b" stroke="#d4a843" stroke-width="1" opacity="0.6"/>
    <text x="770" y="443" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" letter-spacing="2" fill="#d4a843">GATE D</text>
    <text x="770" y="460" text-anchor="middle" font-family="monospace" font-size="10" fill="#6ee7b7">NOMINAL</text>
  </g>

  <!-- Features row -->
  <text x="300" y="510" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6ee7b7" opacity="0.7">&#x2022; AI Copilot</text>
  <text x="480" y="510" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6ee7b7" opacity="0.7">&#x2022; Real-Time Alerts</text>
  <text x="680" y="510" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6ee7b7" opacity="0.7">&#x2022; Spatial Heatmaps</text>
  <text x="880" y="510" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#6ee7b7" opacity="0.7">&#x2022; Live Telemetry</text>

  <!-- Hosted by -->
  <text x="600" y="570" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" letter-spacing="3" fill="#d4a843" opacity="0.5">HOSTED ON VERCEL</text>

  <!-- Version tag -->
  <rect x="540" y="590" width="120" height="24" rx="12" fill="#064e3b" stroke="#d4a843" stroke-width="0.5" opacity="0.4"/>
  <text x="600" y="606" text-anchor="middle" font-family="monospace" font-size="9" letter-spacing="2" fill="#d4a843" opacity="0.6">v1.0.0-HACK</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
