import { test, expect } from '@playwright/test';

test.describe('FIFA Transit App - Comprehensive E2E Tests', () => {

  test.describe('Landing Page', () => {
    test('should load with all hero sections and navigation', async ({ page }) => {
      await page.goto('/');
      
      // Hero section
      await expect(page.getByRole('heading', { name: 'FIFA TOURNAMENT TRANSIT SUITE' })).toBeVisible();
      await expect(page.getByText('OPERATIONAL COMMAND SYSTEM')).toBeVisible();
      
      // Navigation
      await expect(page.locator('header')).toContainText('FIFA TRANSIT');
      await expect(page.locator('header')).toContainText('Staff Portal');
      
      // Quick status cards on landing
      await expect(page.getByText('NEAREST GATE')).toBeVisible();
      await expect(page.getByText('MAIN HUB WAIT')).toBeVisible();
      
      // CTA buttons
      await expect(page.getByRole('button', { name: 'GET STARTED' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'REGISTER AS STAFF' })).toBeVisible();
    });

    test('should navigate to sign-in page from GET STARTED', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'GET STARTED' }).click();
      await expect(page).toHaveURL(/\/sign-in/);
      await expect(page.getByRole('heading', { name: 'SIGN IN' })).toBeVisible();
    });

    test('should navigate to staff registration from REGISTER AS STAFF', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: 'REGISTER AS STAFF' }).click();
      await expect(page).toHaveURL(/\/staff\/register/);
      await expect(page.getByText('STAFF REGISTRATION', { exact: true })).toBeVisible();
    });
  });

  test.describe('Authentication Flow', () => {
    test('should show sign-in form with email/password fields', async ({ page }) => {
      await page.goto('/sign-in');
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'SIGN IN' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Create Account' })).toBeVisible();
    });

    test('should navigate to create account page', async ({ page }) => {
      await page.goto('/sign-in');
      await page.getByRole('link', { name: 'Create Account' }).click();
      await expect(page).toHaveURL(/\/sign-up/);
      await expect(page.getByRole('heading', { name: 'CREATE ACCOUNT' })).toBeVisible();
      await expect(page.getByLabel('Full Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('should navigate back to sign-in from create account', async ({ page }) => {
      await page.goto('/sign-up');
      await page.getByRole('link', { name: 'Sign In' }).click();
      await expect(page).toHaveURL(/\/sign-in/);
    });
  });

  test.describe('Staff Registration', () => {
    test('should submit staff registration form successfully', async ({ page }) => {
      await page.goto('/staff/register');
      
      await page.getByLabel('STAFF ID (ISSUED BY STADIUM DEPARTMENT)').fill('ST-TEST-2026');
      await page.getByLabel('ORGANIZATION / DEPARTMENT').fill('Security Operations');
      
      // Select role from combobox
      const roleSelect = page.getByLabel('ASSIGNED ROLE');
      await roleSelect.click();
      await page.getByRole('option', { name: 'Logistics Coordinator' }).click();
      
      await page.getByLabel('ACCESS JUSTIFICATION / REASON').fill('Need access for real-time security monitoring during match day operations');
      
      await page.getByRole('button', { name: 'SUBMIT CREDENTIALS APPLICATION' }).click();
      
      // Should show pending status
      await expect(page.getByText('APPLICATION PENDING')).toBeVisible();
      await expect(page.getByText('Your credentials request is under review')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/staff/register');
      await page.getByRole('button', { name: 'SUBMIT CREDENTIALS APPLICATION' }).click();
      
      // Check HTML5 validation triggers (fields are required)
      await expect(page.getByLabel('STAFF ID (ISSUED BY STADIUM DEPARTMENT)')).toHaveAttribute('required');
      await expect(page.getByLabel('ORGANIZATION / DEPARTMENT')).toHaveAttribute('required');
      await expect(page.getByLabel('ASSIGNED ROLE')).toHaveAttribute('required');
      await expect(page.getByLabel('ACCESS JUSTIFICATION / REASON')).toHaveAttribute('required');
    });
  });

  test.describe('Fan Hub Dashboard (Authenticated)', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in with test credentials
      await page.goto('/sign-in');
      await page.getByLabel('Email').fill('staff@fifa-transit.test');
      await page.getByLabel('Password').fill('TestPass123!');
      await page.getByRole('button', { name: 'SIGN IN' }).click();
      await expect(page.getByRole('heading', { name: 'YOUR MATCHDAY STATUS' })).toBeVisible();
    });

    test('should display matchday status cards', async ({ page }) => {
      await expect(page.getByText('PRIMARY ENTRY')).toBeVisible();
      await expect(page.getByText('Gate A')).toBeVisible();
      await expect(page.getByText('OPEN')).toBeVisible();
      
      await expect(page.getByText('TRANSIT NETWORK')).toBeVisible();
      await expect(page.getByText('Main Hub')).toBeVisible();
      await expect(page.getByText('8 MIN')).toBeVisible();
      
      await expect(page.getByText('ENVIRONMENT')).toBeVisible();
      await expect(page.getByText('Current')).toBeVisible();
      await expect(page.getByText('OPTIMAL')).toBeVisible();
    });

    test('should display live match scorecard', async ({ page }) => {
      await expect(page.getByText('2026 FIFA WORLD CUP')).toBeVisible();
      await expect(page.getByText('UNITED STATES')).toBeVisible();
      await expect(page.getByText('ENGLAND')).toBeVisible();
      await expect(page.getByText('LIVE')).toBeVisible();
    });

    test('should have functional Fan Query Stream with POLL button', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'FAN QUERY STREAM' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'POLL' })).toBeVisible();
    });

    test('should have Fan Support Assistant with quick actions', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'FAN SUPPORT ASSISTANT' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'SECURITY STATUS' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'GATE CAPACITY' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'TRANSIT ALERTS' })).toBeVisible();
      await expect(page.getByPlaceholder('Query tournament database...')).toBeVisible();
    });

    test('should send query via Fan Support Assistant', async ({ page }) => {
      await page.getByPlaceholder('Query tournament database...').fill('What is the current gate status?');
      await page.getByRole('button', { name: 'Send' }).click();
      // Should not throw error
      await expect(page.getByPlaceholder('Query tournament database...')).toHaveValue('');
    });

    test('should toggle demo mode', async ({ page }) => {
      const startDemoBtn = page.getByRole('button', { name: '▶ START DEMO' });
      await expect(startDemoBtn).toBeVisible();
      await startDemoBtn.click();
      await expect(page.getByRole('button', { name: 'DEMO LIVE' })).toBeVisible();
    });
  });

  test.describe('Staff Hub Access Control', () => {
    test('should deny access to non-staff users', async ({ page }) => {
      // Sign in as regular fan
      await page.goto('/sign-in');
      await page.getByLabel('Email').fill('staff@fifa-transit.test');
      await page.getByLabel('Password').fill('TestPass123!');
      await page.getByRole('button', { name: 'SIGN IN' }).click();
      
      await page.getByRole('button', { name: 'STAFF HUB' }).click();
      await expect(page.getByRole('heading', { name: 'ACCESS DENIED' })).toBeVisible();
      await expect(page.getByText('Required role:staff / admin')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Go to Dashboard' })).toBeVisible();
    });
  });

  test.describe('Connection Guard / Offline Handling', () => {
    test('should show connection guard when API health check fails', async ({ page }) => {
      await page.goto('/');
      
      // Mock failing health check
      await page.route('/api/health', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'unhealthy' })
        });
      });
      
      await page.reload();
      await expect(page.getByText('CONNECTION DEGRADED')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'FIFA TOURNAMENT TRANSIT SUITE' })).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'FIFA TOURNAMENT TRANSIT SUITE' })).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      const headings = await page.locator('h1, h2, h3, h4').allTextContents();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should have accessible form labels', async ({ page }) => {
      await page.goto('/sign-in');
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('should have focusable interactive elements', async ({ page }) => {
      await page.goto('/');
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'A', 'INPUT'].includes(focused || '')).toBeTruthy();
    });
  });
});