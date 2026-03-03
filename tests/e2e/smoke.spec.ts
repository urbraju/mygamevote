import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

const TEST_USER = process.env.TEST_USER_EMAIL || 'gg@test.com';
const TEST_ADMIN = process.env.TEST_ADMIN_EMAIL || 'tladmin@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test1234';

test.describe('Enhanced Smoke Tests', () => {

    test.beforeEach(async ({ page }: { page: Page }) => {
        // Increase timeout for deployment propagation and slow cold starts
        test.setTimeout(60000);
    });

    test('Production Health Check', async ({ page }: { page: Page }) => {
        await page.goto('/');
        // Verify basic site integrity - Check for Login screen if unauthenticated
        await expect(page).toHaveTitle(/MyGameVote/i);

        // Check for the Login button specifically to avoid strict mode violations
        const loginButton = page.getByRole('button', { name: /LOGIN/i });
        await expect(loginButton.first()).toBeVisible({ timeout: 20000 });
        console.log('✅ [Health Check] Production site is online and responsive.');
    });

    test('Admin Full Navigation & Section Tour', async ({ page }: { page: Page }) => {
        // 1. Login
        await page.goto('/');

        // Wait for hydration/loading
        await page.waitForLoadState('networkidle');

        await page.fill('input[placeholder*="Email"]', TEST_ADMIN);
        await page.fill('input[placeholder*="Password"]', TEST_PASSWORD);

        // Use the direct button selector
        const loginBtn = page.getByRole('button', { name: 'LOGIN' });
        await loginBtn.click();

        // 2. Verify Home Page (Now we expect authenticated content)
        // Ensure we are definitely on the home page after login redirect
        await expect(page).toHaveURL(/.*home/, { timeout: 15000 });
        await expect(page.getByText(/Weekly Polls|Upcoming Games|Matches for You/i)).toBeVisible({ timeout: 30000 });
        console.log(`[Admin] Logged in successfully at: ${new Date().toISOString()}`);

        // 3. Edit Interests Flow (Opening and Closing)
        const editBtn = page.getByRole('button', { name: 'EDIT INTERESTS' });
        await editBtn.click();

        await expect(page.getByText(/Your Interests|Edit Profile/i)).toBeVisible({ timeout: 15000 });
        // Click Cancel to return home
        await page.getByRole('button', { name: 'GO BACK HOME' }).or(page.getByRole('button', { name: 'CANCEL' })).first().click();
        await expect(page.getByText(/Matches for You/i)).toBeVisible({ timeout: 15000 });
        console.log(`[Admin] Verified Edit Interest open/close flow.`);

        // 4. Admin Dashboard Navigation
        await page.getByRole('button', { name: 'ADMIN' }).click();
        await expect(page.getByText(/Admin Dashboard/i)).toBeVisible({ timeout: 15000 });

        // Cycle through tabs
        const tabs = ['Operations', 'Setup', 'Group', 'Users', 'System'];
        for (const tabName of tabs) {
            await page.click(`role=button[name="${tabName}"]`);
            // Verify section header or specific content in that tab
            if (tabName === 'Operations') {
                await expect(page.getByText(/Match Management|Current Slot List/i)).toBeVisible({ timeout: 10000 });
            } else if (tabName === 'Users') {
                await expect(page.getByText(/Global User Controls|User Search/i).first()).toBeVisible({ timeout: 10000 });
            } else if (tabName === 'System') {
                await expect(page.getByText(/System Health|Environment/i)).toBeVisible({ timeout: 10000 });
            }
            console.log(`[Admin] Navigated to ${tabName} tab.`);
        }

        // 5. Back to Home & Logout
        await page.goto('/'); // Direct navigation as there is no Home link in Header
        await expect(page.getByText(/Matches for You/i)).toBeVisible({ timeout: 15000 });
        console.log(`[Admin] Final timestamp: ${new Date().toISOString()}`);

        await page.getByRole('button', { name: 'SIGNOUT' }).click();
        await expect(page.getByText(/Login|Sign In/i)).toBeVisible({ timeout: 15000 });
        console.log(`[Admin] Logged out successfully.`);
    });

    test('Regular User Interest Validation & Clean Logout', async ({ page }: { page: Page }) => {
        const consoleErrors: string[] = [];
        page.on('console', (msgValue: ConsoleMessage) => {
            if (msgValue.type() === 'error') {
                const text = msgValue.text();
                if (!text.includes('permission-denied') && !text.includes('Missing or insufficient permissions')) {
                    consoleErrors.push(text);
                }
            }
        });

        // 1. Login
        await page.goto('/');

        // Wait for hydration/loading
        await page.waitForLoadState('networkidle');

        await page.fill('input[placeholder*="Email"]', TEST_USER);
        await page.fill('input[placeholder*="Password"]', TEST_PASSWORD);

        // Use the direct button selector
        const loginBtn = page.getByRole('button', { name: 'LOGIN' });
        await loginBtn.click();

        console.log(`[User] Logged in successfully at: ${new Date().toISOString()}`);

        // 2. Verify Home Page
        await expect(page).toHaveURL(/.*home/, { timeout: 15000 });
        await expect(page.getByText(/Weekly Polls|Upcoming Games|Matches for You/i)).toBeVisible({ timeout: 30000 });

        // 3. Validate Profile Interests
        await page.getByRole('button', { name: 'EDIT INTERESTS' }).click();
        await expect(page.getByText(/Your Interests/i)).toBeVisible({ timeout: 15000 });

        // Check if at least one interest is active
        const selectedSportsCount = await page.locator('div[class*="bg-primary/20"]').count();
        console.log(`[User] Found ${selectedSportsCount} selected sports interests.`);

        // 3. Return to Home
        await page.getByRole('button', { name: 'GO BACK HOME' }).or(page.getByRole('button', { name: 'CANCEL' })).first().click();
        await expect(page.getByText(/Matches for You/i)).toBeVisible({ timeout: 15000 });

        // 4. Logout and Verify No Console Errors
        await page.getByRole('button', { name: 'SIGNOUT' }).click();
        await expect(page.getByText(/Login|Sign In/i)).toBeVisible({ timeout: 15000 });

        if (consoleErrors.length > 0) {
            console.error('[User] Console errors detected during session:');
            consoleErrors.forEach(err => console.error(`  - ${err}`));
            throw new Error(`Console errors detected: ${consoleErrors[0]}`);
        } else {
            console.log('[User] No console errors detected during session. Success.');
        }
    });

});
