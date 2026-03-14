import { test, expect, type Page } from '@playwright/test';

const TEST_ADMIN = process.env.TEST_ADMIN_EMAIL || 'tladmin@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test1234';

test.describe('Sports Hub E2E Tests', () => {

    test.beforeEach(async ({ page }: { page: Page }) => {
        test.setTimeout(90000);
        // Login as admin
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.fill('input[placeholder*="Email"]', TEST_ADMIN);
        await page.fill('input[placeholder*="Password"]', TEST_PASSWORD);
        await page.getByRole('button', { name: 'LOGIN' }).click();
        await expect(page).toHaveURL(/.*home/, { timeout: 30000 });
    });

    test('Explore Sports Hub and View Detail', async ({ page }: { page: Page }) => {
        // Diagnostic: Listen for console errors during this specific test
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log(`[E2E Detail Diagnostic] Console Error: ${msg.text()}`);
                consoleErrors.push(msg.text());
            }
        });

        // Navigate to Explore using testID
        const exploreBtn = page.getByTestId('header-explore-btn');
        await expect(exploreBtn).toBeVisible({ timeout: 25000 });
        await exploreBtn.click();
        
        // Wait for Hub to load
        await expect(page.getByText(/Sports Hub/i)).toBeVisible({ timeout: 25000 });

        // Click on a sport (Volleyball is a stable local fallback)
        const volleyballCard = page.getByTestId('sport-card-volleyball');
        await expect(volleyballCard).toBeVisible({ timeout: 15000 });
        await volleyballCard.click();

        // Verify Sport Detail page
        // Use testID for more robust matching of "Knowledge Hub" label
        const hubLabel = page.getByTestId('sport-detail-hub-label');
        await expect(hubLabel).toBeVisible({ timeout: 25000 });
        await expect(hubLabel).toHaveText(/Knowledge Hub/i);

        // Verify key sections exist
        await expect(page.getByTestId('section-basics')).toBeVisible();
        await expect(page.getByTestId('section-rules')).toBeVisible();
        await expect(page.getByTestId('section-events')).toBeVisible();

        // Check if fallback images or 403s were triggered in console
        if (consoleErrors.some(err => err.includes('403') || err.includes('Forbidden'))) {
            console.log('⚠️ [E2E Warning] Detected 403 errors during detail page load.');
        }
    });

    test('Admin Refresh Flow', async ({ page }: { page: Page }) => {
        // Navigate to Admin using testID
        const adminBtn = page.getByTestId('header-admin-btn');
        await expect(adminBtn).toBeVisible({ timeout: 25000 });
        await adminBtn.click();
        await expect(page.getByText(/Admin Dashboard/i)).toBeVisible({ timeout: 25000 });

        // Find System tab
        const systemTab = page.getByTestId('admin-tab-system');
        await systemTab.click();

        // Scroll to find the Automated Refresh button
        const refreshBtn = page.getByTestId('admin-system-refresh-btn');
        await refreshBtn.scrollIntoViewIfNeeded();
        await expect(refreshBtn).toBeVisible({ timeout: 15000 });

        // Note: We check if it exists and is enabled
        await expect(refreshBtn).toBeEnabled();
    });
});
