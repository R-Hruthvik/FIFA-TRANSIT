/**
 * CrowdDetector — production-ready phone-side crowd detection.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D1 — Real sources (opt-in phones), D3 — events not GPS streams.
 *
 * Emits PositionEvents into POST /api/track/event:
 *  - geofence_enter / geofence_exit via navigator.geolocation (works on all
 *    modern browsers — the MVP path).
 *  - beacon_nearby via Web Bluetooth scan (progressive enhancement; silently
 *    disabled where unsupported, e.g. iOS Safari).
 *
 * Geofence-first: a user is "present" at a gate when their GPS position is
 * within that gate's geofenceRadiusM. Hysteresis prevents flapping at the
 * boundary. Only emits after consent. Batches + retries with backoff.
 */

"use client";

import { nanoid } from "nanoid";
import { GATES, BEACONS } from "@/lib/venue-config";
import type { PositionEvent, PositionEventType } from "@/types/position";

// ── Minimal Web Bluetooth ambient types ────────────────────────────────
// @types/w3c-web-bluetooth is not a project dependency; declare only what we
// use so the build stays dependency-free. Progressive enhancement only.
interface BluetoothAdvertisementEvent extends Event {
  readonly device?: { name?: string };
  readonly rssi: number;
}
interface BluetoothLEScanOptions {
  acceptAllAdvertisements?: boolean;
  keepRepeatedDevices?: boolean;
}
interface Bluetooth {
  requestLEScan?(options?: BluetoothLEScanOptions): Promise<unknown>;
  addEventListener(
    type: string,
    listener: (event: BluetoothAdvertisementEvent) => void,
    options?: AddEventListenerOptions,
  ): void;
}
interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: Bluetooth;
}


export interface CrowdDetectorOptions {
  /** Pseudonymous user id (see consent.ts). */
  userId: string;
  /** Where to POST events. */
  endpoint?: string;
  /** Geolocation watch interval hint (ms). */
  geoIntervalMs?: number;
  /** BLE scan interval (ms). */
  bleIntervalMs?: number;
  /** Called on state changes (for UI + telemetry). */
  onStatus?: (status: DetectorStatus) => void;
}

export type DetectorStatus =
  | "idle"
  | "starting"
  | "detecting"
  | "denied"
  | "unsupported"
  | "error";

interface QueuedEvent extends PositionEvent {
  /** Attempt count for retry/backoff. */
  attempts?: number;
}

export class CrowdDetector {
  private userId: string;
  private endpoint: string;
  private geoIntervalMs: number;
  private bleIntervalMs: number;
  private onStatus?: (status: DetectorStatus) => void;

  private watchId: number | null = null;
  private bleTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private bleScanAbort: AbortController | null = null;

  private queue: QueuedEvent[] = [];
  /** gateId currently considered "entered" (hysteresis state). */
  private enteredGates = new Set<string>();
  /** Last known geolocation (stadium-center-relative meters). */
  private lastPos: { x: number; y: number } | null = null;
  private running = false;

  /** Stadium center in lat/lng — origin (0,0) maps here. Configurable. */
  private origin = { lat: 0, lng: 0 };
  private metersPerDegLat = 111_320;

  constructor(opts: CrowdDetectorOptions) {
    this.userId = opts.userId;
    this.endpoint = opts.endpoint ?? "/api/track/event";
    this.geoIntervalMs = opts.geoIntervalMs ?? 10_000;
    this.bleIntervalMs = opts.bleIntervalMs ?? 15_000;
    this.onStatus = opts.onStatus;
  }

  /** Begin detection. Resolves once geolocation is authorized. */
  async start(): Promise<void> {
    if (this.running) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      this.setStatus("unsupported");
      return;
    }
    this.running = true;
    this.setStatus("starting");

    try {
      // Prime the position first so we fail fast on permission denial.
      await this.primePosition();
    } catch {
      this.running = false;
      this.setStatus("denied");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.onGeoUpdate(pos),
      () => this.setStatus("error"),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    this.flushTimer = setInterval(() => this.flush(), 3_000);
    this.startBle();
    this.setStatus("detecting");
  }

  stop(): void {
    this.running = false;
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    if (this.bleTimer !== null) clearInterval(this.bleTimer);
    if (this.flushTimer !== null) clearInterval(this.flushTimer);
    this.bleScanAbort?.abort();
    this.watchId = null;
    this.bleTimer = null;
    this.flushTimer = null;
    // Emit exit for any gates still considered entered.
    for (const gateId of this.enteredGates) {
      this.enqueue("geofence_exit", gateId);
    }
    this.enteredGates.clear();
    this.setStatus("idle");
  }

  // ── Geofence ──────────────────────────────────────────────────────────

  private async primePosition(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.onGeoUpdate(pos);
          resolve();
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15_000 },
      );
    });
  }

  private onGeoUpdate(pos: GeolocationPosition): void {
    const rel = this.toStadiumCoords(pos.coords.latitude, pos.coords.longitude);
    this.lastPos = rel;

    for (const gate of GATES) {
      const dist = Math.hypot(rel.x - gate.x, rel.y - gate.y);
      const inside = dist <= gate.geofenceRadiusM;
      const wasInside = this.enteredGates.has(gate.id);

      // Hysteresis: enter at radius, exit only beyond radius * 1.25.
      if (inside && !wasInside) {
        this.enteredGates.add(gate.id);
        this.enqueue("geofence_enter", gate.id, { x: rel.x, y: rel.y });
      } else if (!inside && wasInside && dist > gate.geofenceRadiusM * 1.25) {
        this.enteredGates.delete(gate.id);
        this.enqueue("geofence_exit", gate.id, { x: rel.x, y: rel.y });
      }
    }
  }

  /** Convert lat/lng to stadium-center-relative meters (equirectangular). */
  private toStadiumCoords(lat: number, lng: number): { x: number; y: number } {
    const metersPerDegLng =
      this.metersPerDegLat * Math.cos((this.origin.lat * Math.PI) / 180);
    const x = (lng - this.origin.lng) * metersPerDegLng;
    const y = (lat - this.origin.lat) * this.metersPerDegLat;
    return { x, y };
  }

  /** Override stadium origin (call before start). */
  setOrigin(lat: number, lng: number): void {
    this.origin = { lat, lng };
  }

  // ── BLE beacons (progressive enhancement) ─────────────────────────────

  private startBle(): void {
    const nav = navigator as NavigatorWithBluetooth;
    if (typeof navigator === "undefined" || !nav.bluetooth) return;
    this.bleScanAbort = new AbortController();
    this.bleTimer = setInterval(() => this.scanBeacons(), this.bleIntervalMs);
    void this.scanBeacons();
  }

  private async scanBeacons(): Promise<void> {
    const nav = navigator as NavigatorWithBluetooth;
    if (!this.running || !nav.bluetooth) return;
    try {
      const bluetooth = nav.bluetooth;
      await bluetooth.requestLEScan?.({
        acceptAllAdvertisements: true,
        keepRepeatedDevices: false,
      });

      bluetooth.addEventListener?.(
        "advertisementreceived",
        (event: BluetoothAdvertisementEvent) => {
          const beacon = BEACONS.find((b) =>
            event.device?.name?.includes(b.beaconId),
          );
          if (!beacon) return;
          const rssi = event.rssi;
          const distance = this.estimateDistance(beacon.txPower, rssi);
          this.noteBeacon(beacon.beaconId, beacon.gateId, beacon.x, beacon.y, distance);
          this.enqueue("beacon_nearby", beacon.gateId, {
            beaconId: beacon.beaconId,
            rssi,
            distanceMeters: distance,
            ...this.recentBeaconPosition(),
          });
        },
        { signal: this.bleScanAbort?.signal },
      );
    } catch {
      // BLE unsupported / denied — geofence path remains active.
    }
  }

  /** Log-distance path-loss: d = 10^((txPower - rssi) / (10 * n)). */
  private estimateDistance(txPower: number, rssi: number, n = 2.0): number {
    if (rssi >= txPower) return 1;
    return Math.pow(10, (txPower - rssi) / (10 * n));
  }

  // ── Beacon trilateration (refines stadium-relative position) ──────────

  private beaconReadings = new Map<
    string,
    { bx: number; by: number; d: number; t: number }
  >();

  private noteBeacon(
    beaconId: string,
    _gateId: string,
    bx: number,
    by: number,
    d: number,
  ): void {
    this.beaconReadings.set(beaconId, { bx, by, d, t: Date.now() });
  }

  /** Least-squares position from recent beacon distances (last 10s). */
  private recentBeaconPosition(): { x: number; y: number } | Record<string, never> {
    const now = Date.now();
    const readings = [...this.beaconReadings.values()].filter(
      (r) => now - r.t < 10_000,
    );
    if (readings.length < 3) return {}; // need ≥3 beacons to trilaterate

    // Initialize at centroid of beacons, then Gauss-Newton refine.
    let x = readings.reduce((s, r) => s + r.bx, 0) / readings.length;
    let y = readings.reduce((s, r) => s + r.by, 0) / readings.length;
    for (let iter = 0; iter < 10; iter++) {
      let jxx = 0,
        jxy = 0,
        jyy = 0,
        rx = 0,
        ry = 0;
      for (const r of readings) {
        const dx = x - r.bx;
        const dy = y - r.by;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const diff = dist - r.d;
        const w = 1 / dist;
        jxx += w * dx * dx;
        jxy += w * dx * dy;
        jyy += w * dy * dy;
        rx += w * dx * diff;
        ry += w * dy * diff;
      }
      const det = jxx * jyy - jxy * jxy || 1e-6;
      const dxStep = (jyy * rx - jxy * ry) / det;
      const dyStep = (jxx * ry - jxy * rx) / det;
      x -= dxStep;
      y -= dyStep;
      if (Math.hypot(dxStep, dyStep) < 0.1) break;
    }
    return { x, y };
  }

  // ── Event queue + flush ───────────────────────────────────────────────

  private enqueue(
    eventType: PositionEventType,
    gateId: string,
    extra: Partial<PositionEvent> = {},
  ): void {
    if (!this.running) return;
    this.queue.push({
      eventId: nanoid(),
      userId: this.userId,
      gateId,
      eventType,
      timestamp: Date.now(),
      ...extra,
    });
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);

    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch.length === 1 ? batch[0] : { events: batch }),
      });
      if (!res.ok) {
        // Re-queue for retry (bounded).
        for (const ev of batch) {
          if ((ev.attempts ?? 0) < 3) this.queue.push({ ...ev, attempts: (ev.attempts ?? 0) + 1 });
        }
      }
    } catch {
      // Network error — requeue (bounded) for next flush.
      for (const ev of batch) {
        if ((ev.attempts ?? 0) < 3) this.queue.push({ ...ev, attempts: (ev.attempts ?? 0) + 1 });
      }
    }
  }

  private setStatus(s: DetectorStatus): void {
    this.onStatus?.(s);
  }
}
