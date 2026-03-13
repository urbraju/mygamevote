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
        // Navigate to Explore
        await page.getByTestId('header-explore-btn').click();
        await expect(page.getByText(/Explore Sports Hub/i)).toBeVisible({ timeout: 15000 });

        // Click on a sport (Volleyball is usually present)
        const volleyballCard = page.getByText('Volleyball').first();
        await volleyballCard.click();

        // Verify Sport Detail page
        await expect(page.getByText('Knowledge Hub')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Master the Basics')).toBeVisible();
        await expect(page.getByText('Official Rules')).toBeVisible();
        await expect(page.getByText('Upcoming Events')).toBeVisible();
    });

    test('Admin Refresh Flow', async ({ page }: { page: Page }) => {
        // Navigate to Admin -> System
        await page.getByTestId('header-admin-btn').click();
        await expect(page.getByText(/Admin Dashboard/i)).toBeVisible({ timeout: 15000 });

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
