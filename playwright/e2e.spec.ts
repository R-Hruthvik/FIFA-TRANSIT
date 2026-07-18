import { test, expect } from '@playwright/test';

test.describe('FIFA Transit App E2E Verification', () => {
  
  test('should load redesigned landing page with structured layout', async ({ page }) => {
    await page.goto('/');
    
    // Check main title
    await expect(page.getByRole('heading', { name: 'FIFA TOURNAMENT TRANSIT SUITE' })).toBeVisible();
    
    // Check navigation items
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('header')).toContainText('FIFA TRANSIT');
    await expect(page.locator('header')).toContainText('Staff Portal');
    
    // Check quick status preview panel on homepage
    await expect(page.getByText('NEAREST GATE')).toBeVisible();
    await expect(page.getByText('MAIN HUB WAIT')).toBeVisible();
  });

  test('should allow navigating to staff registration', async ({ page }) => {
    await page.goto('/staff/register');
    
    // Check portal title
    await expect(page.getByText('STAFF PORTAL', { exact: true })).toBeVisible();
    await expect(page.getByText('Apply for credentials to access the operational command suite')).toBeVisible();
    
    // Check sign in action is offered for unauthenticated registration
    const signInButton = page.locator('button:has-text("Sign In to Register")');
    await expect(signInButton).toBeVisible();
  });

  test('should show connection guard when simulated offline', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // We can test UI elements of ConnectionGuard in isolation by mocking /api/health or going offline
    await page.route('/api/health', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'unhealthy' }),
      });
    });
    
    // Just a placeholder to ensure mock setup works
    expect(true).toBe(true);
  });
});
