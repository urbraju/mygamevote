// CI Trigger: Stability Update for WebKit dependencies and real-time voting sync
import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

const TEST_USER = process.env.TEST_USER_EMAIL || 'gg@test.com';
const TEST_ADMIN = process.env.TEST_ADMIN_EMAIL || 'tladmin@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test1234';

test.describe('Enhanced Smoke Tests (API/Logic focus shifted to Jest)', () => {

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
        await expect(loginButton.first()).toBeVisible({ timeout: 30000 });
        console.log('✅ [Health Check] Production site is online and responsive.');
    });

    test('Admin Basic Login & Logout', async ({ page }: { page: Page }) => {
        // 1. Login
        await page.goto('/');

        // Wait for hydration/loading
        await page.waitForLoadState('networkidle');

        await page.fill('input[placeholder*="Email"]', TEST_ADMIN);
        await page.fill('input[placeholder*="Password"]', TEST_PASSWORD);

        // Use the direct button selector
        const loginBtn = page.getByRole('button', { name: 'LOGIN' });
        await loginBtn.click();

        // 2. Verify Home Page
        await expect(page).toHaveURL(/.*home/, { timeout: 30000 });
        await expect(page.getByText(/Weekly Polls|Upcoming Games|Matches for You|No Matches Found/i).first()).toBeVisible({ timeout: 35000 });
        console.log(`[Admin] Logged in successfully at: ${new Date().toISOString()}`);

        // 3. Admin Routing Check (Just verifying the tab can load without crashing)
        await page.getByRole('button', { name: 'ADMIN' }).click();
        await expect(page.getByText(/Admin Dashboard/i)).toBeVisible({ timeout: 15000 });

        // 4. Back to Home & Logout
        await page.getByRole('button', { name: 'HOME' }).click(); // Client-side navigation
        await expect(page.getByText(/Weekly Polls|Upcoming Games|Matches for You|No Matches Found/i).first()).toBeVisible({ timeout: 30000 });

        await page.getByRole('button', { name: /SIGNOUT/i }).click();
        await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible({ timeout: 15000 });
        console.log(`[Admin] Logged out successfully.`);
    });

    test('Regular User Basic Login', async ({ page }: { page: Page }) => {
        const consoleErrors: string[] = [];
        page.on('console', (msgValue: ConsoleMessage) => {
            if (msgValue.type() === 'error') {
                const text = msgValue.text();
                // 403 logging for diagnosis
                if (text.includes('403')) {
                    console.log(`[E2E Diagnostic] Observed 403: ${text}`);
                }

                const isIgnored = text.includes('permission-denied') ||
                    text.includes('Missing or insufficient permissions') ||
                    text.includes('403 (Forbidden)') ||
                    text.includes('Failed to load resource') ||
                    text.includes('%c%d') ||
                    text.includes('ZHtr: HswC') ||
                    text.includes('font-size:0;color:transparent');

                if (!isIgnored) {
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
        await expect(page).toHaveURL(/.*home/, { timeout: 30000 });
        await expect(page.getByText(/Weekly Polls|Upcoming Games|Matches for You|No Matches Found/i).first()).toBeVisible({ timeout: 35000 });

        // 3. Logout and Verify No Console Errors
        await page.getByRole('button', { name: 'SIGNOUT' }).click();
        await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible({ timeout: 15000 });

        if (consoleErrors.length > 0) {
            console.error('[User] Console errors detected during session:');
            consoleErrors.forEach(err => console.error(`  - ${err}`));
            throw new Error(`Console errors detected: ${consoleErrors[0]}`);
        } else {
            console.log('[User] No console errors detected during session. Success.');
        }
    });

});
