/**
 * Consent + pseudonymous identity for crowd detection.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D1 — Real sources (opt-in only), D9 — privacy hard requirement.
 *
 * The CrowdDetector must not emit a single event unless the fan has opted in.
 * Identity is pseudonymous: we derive a stable anon id from a per-install
 * secret + salt via Web Crypto HMAC, so the server never sees a real identity.
 */

"use client";

const CONSENT_KEY = "fifa_track_consent";
const ANON_ID_KEY = "fifa_anon_id";
const ANON_SALT = "fifa-2026-egress-v1";

/** Generate a pseudonymous id, persisted for the install lifetime. */
export async function getPseudonymousId(): Promise<string> {
  let cached = localStorage.getItem(ANON_ID_KEY);
  if (cached) return cached;

  // Random install secret → HMAC with salt → stable anon id.
  const seed = crypto.randomUUID();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(ANON_SALT),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(seed));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  cached = `anon_${hex.slice(0, 16)}`;
  localStorage.setItem(ANON_ID_KEY, cached);
  return cached;
}

/** Whether the local user has granted tracking consent. */
export function hasLocalConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === "true";
}

/**
 * Persist opt-in/opt-out locally and server-side (D9 consent store).
 * Server write goes through /api/track/consent so the mongodb driver stays
 * out of the browser bundle.
 */
export async function setConsent(optedIn: boolean): Promise<void> {
  localStorage.setItem(CONSENT_KEY, optedIn ? "true" : "false");
  const userId = await getPseudonymousId();
  try {
    await fetch("/api/track/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, optedIn }),
    });
  } catch {
    // Local consent remains authoritative; server sync retried next opt-in.
  }
}

/** Server-side consent check (used by detector before emitting). */
export async function serverHasConsent(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/track/consent?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return false;
    const data = (await res.json()) as { optedIn?: boolean };
    return data.optedIn === true;
  } catch {
    return false;
  }
}
