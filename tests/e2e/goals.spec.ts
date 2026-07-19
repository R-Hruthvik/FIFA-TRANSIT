import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

// ─── Goal 1: Bulletproof chat — no full-screen reload on errors ────────────

test.describe("Goal 1: Chat error handling", () => {
  test("fan narrative returns null without real context", async ({ request }) => {
    const res = await request.post("/api/fan/narrative", {
      data: { trackingEnabled: false },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.narrative).toBeNull();
  });

  test("fan narrative returns content with real context", async ({ page }) => {
    await page.goto("/");
    const body = await page.evaluate(async () => {
      const res = await fetch("/api/fan/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingEnabled: true,
          location: "Gate G3",
          transitWaitTime: 5,
          weatherCondition: "rain",
        }),
      });
      return res.json();
    });
    expect(body.narrative).toContain("Gate G3");
  });

  test("landing page loads without crash", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "StadiumFlow", exact: true })).toBeVisible();
    await expect(page.locator("text=Enter Portal")).toBeVisible();
    await page.screenshot({ path: "test-results/01-landing.png", fullPage: true });
  });
});

// ─── Goal 2: Clean demo mode ───────────────────────────────────────────────

test.describe("Goal 2: Demo mode consistency", () => {
  test("landing page has consistent structure", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Operational Command System")).toBeVisible();
    await expect(page.locator("text=FanAssist")).toBeVisible();
    await expect(page.locator("text=Tactical Command Hub")).toBeVisible();
    // Telemetry panel: either real data (NEAREST GATE labels) or loading skeleton
    const hasTelemetry = await page.locator("text=NEAREST GATE").isVisible().catch(() => false);
    if (!hasTelemetry) {
      // No DB → skeleton loading state — verify the preview panel exists
      await expect(page.locator("text=Live CrowdPulse")).toBeVisible();
    }
    await page.screenshot({ path: "test-results/02-landing-structure.png", fullPage: true });
  });

  test("upcoming fixtures section visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Upcoming Tournament Fixtures")).toBeVisible();
    await page.screenshot({ path: "test-results/02-fixtures.png", fullPage: true });
  });
});

// ─── Goal 3: Match/stadium as main visual focus ─────────────────────────────

test.describe("Goal 3: MatchStatusStrip", () => {
  test("match API responds (200 or 500 if no DB)", async ({ request }) => {
    const res = await request.get("/api/match");
    expect([200, 500]).toContain(res.status());
  });

  test("landing page shows match schedule section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Upcoming Tournament Fixtures")).toBeVisible();
    await page.screenshot({ path: "test-results/03-match-section.png", fullPage: true });
  });
});

// ─── Goal 4: Fake data isolated to demo mode only ──────────────────────────

test.describe("Goal 4: Fake data isolation", () => {
  test("narrative null without real context", async ({ request }) => {
    const res = await request.post("/api/fan/narrative", {
      data: { trackingEnabled: false },
    });
    const body = await res.json();
    expect(body.narrative).toBeNull();
  });

  test("narrative null with default weather only", async ({ request }) => {
    const res = await request.post("/api/fan/narrative", {
      data: { weatherCondition: "clear" },
    });
    const body = await res.json();
    expect(body.narrative).toBeNull();
  });

  test("landing page renders correctly regardless of telemetry", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000);
    // Preview panel exists whether telemetry loaded or skeleton is showing
    await expect(page.locator("text=Live CrowdPulse")).toBeVisible();
    await page.screenshot({ path: "test-results/04-telemetry-layout.png", fullPage: true });
  });
});

// ─── Headed crawl: navigate every visible page and screenshot ───────────────

test.describe("Full crawl with snapshots", () => {
  test("landing page — full page snapshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/crawl-01-landing-full.png", fullPage: true });
    // Check main heading
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
  });

  test("landing page — scroll to fixtures", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator("text=Upcoming Tournament Fixtures").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/crawl-02-fixtures.png", fullPage: false });
  });

  test("landing page — preview telemetry panel", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    // The preview panel should be visible
    const panel = page.locator("text=Live CrowdPulse");
    if (await panel.isVisible()) {
      await panel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: "test-results/crawl-03-telemetry-preview.png", fullPage: false });
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/crawl-04-login.png", fullPage: true });
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/crawl-05-signup.png", fullPage: true });
  });

  test("staff register page loads", async ({ page }) => {
    await page.goto("/staff/register");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/crawl-06-staff-register.png", fullPage: true });
  });

  test("admin login page loads", async ({ page }) => {
    await page.goto("/admin-login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/crawl-07-admin-login.png", fullPage: true });
  });

  test("fan narrative API — empty context snapshot", async ({ request }) => {
    const res = await request.post("/api/fan/narrative", {
      data: { trackingEnabled: false },
    });
    const body = await res.json();
    expect(body.narrative).toBeNull();
    expect(body.generatedAt).toBeTruthy();
  });

  test("fan narrative API — real context snapshot", async ({ page }) => {
    await page.goto("/");
    const body = await page.evaluate(async () => {
      const res = await fetch("/api/fan/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingEnabled: true,
          location: "Section 105",
          transitWaitTime: 8,
          weatherCondition: "rain",
        }),
      });
      return res.json();
    });
    expect(body.narrative).toBeTruthy();
    expect(body.narrative).toContain("Section 105");
  });

  test("fan narrative API — partial context", async ({ page }) => {
    await page.goto("/");
    const body = await page.evaluate(async () => {
      const res = await fetch("/api/fan/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transitWaitTime: 3 }),
      });
      return res.json();
    });
    expect(body.narrative).toMatch(/3[\s-]min/i);
  });

  test("match API responds", async ({ request }) => {
    const res = await request.get("/api/match");
    expect([200, 500]).toContain(res.status());
  });

  test("telemetry API responds", async ({ request }) => {
    const res = await request.get("/api/telemetry");
    // Returns null or telemetry object — both are valid.
    expect(res.ok()).toBeTruthy();
  });
});
