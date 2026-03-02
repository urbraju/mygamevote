import { test, expect } from '@playwright/test';

// These should be set in GitHub Secrets/Environment
const TEST_USER = process.env.TEST_USER_EMAIL || 'gg@test.com';
const TEST_ADMIN = process.env.TEST_ADMIN_EMAIL || 'tladmin@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test1234';

test.describe('Authentication Flow', () => {

    test('Regular User Login', async ({ page }) => {
        await page.goto('/');

        // Check if we are on login screen or redirected
        // Assuming the login button/input becomes visible
        await page.waitForSelector('input[placeholder*="Email"]', { timeout: 15000 });

        await page.fill('input[placeholder*="Email"]', TEST_USER);
        await page.fill('input[placeholder*="Password"]', TEST_PASSWORD);

        // Find the login button - usually text containing "Sign In" or "Login"
        await page.click('role=button[name=/Sign In|Login/i]');

        // Verify redirection to home/dashboard
        // Looking for an element that only appears when logged in (e.g., Home title or Game Slots)
        await expect(page.getByText(/Weekly Polls|Upcoming Games/i)).toBeVisible({ timeout: 20000 });

        console.log(`Successfully logged in as Regular User: ${TEST_USER}`);
    });

    test('Admin User Login', async ({ page }) => {
        await page.goto('/');

        await page.waitForSelector('input[placeholder*="Email"]', { timeout: 15000 });

        await page.fill('input[placeholder*="Email"]', TEST_ADMIN);
        await page.fill('input[placeholder*="Password"]', TEST_PASSWORD);

        await page.click('role=button[name=/Sign In|Login/i]');

        // Verify redirection to home
        await expect(page.getByText(/Weekly Polls|Upcoming Games/i)).toBeVisible({ timeout: 20000 });

        // Try to navigate to admin - usually a tab or explicit route
        // In our app, we can try to go directly to /admin or look for the Admin button
        // Let's look for "Admin" tab/button
        const adminButton = page.locator('role=link[name=/Admin/i], role=button[name=/Admin/i]');
        if (await adminButton.isVisible()) {
            await adminButton.click();
            await expect(page.getByText(/Admin Dashboard|User Management/i)).toBeVisible({ timeout: 10000 });
            console.log(`Successfully verified Admin Dashboard access for: ${TEST_ADMIN}`);
        } else {
            // Fallback: try navigating directly
            await page.goto('/admin');
            await expect(page.getByText(/Admin Dashboard|User Management/i)).toBeVisible({ timeout: 10000 });
            console.log(`Successfully verified Admin Dashboard via direct navigation for: ${TEST_ADMIN}`);
        }
    });

});
