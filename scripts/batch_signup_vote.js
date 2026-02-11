const puppeteer = require('puppeteer-core');

(async () => {
    const TARGET_URL = 'http://localhost:8083'; // Ensure this matches your running server
    const USER_COUNT = 14;
    const BASE_NAME = 'firstlast';
    const PASSWORD = 'password123';

    console.log(`[Test] Starting UI Automation for ${USER_COUNT} users...`);

    // Launch browser
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--window-size=1280,800'],
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' // Point to system Chrome
    });

    const page = await browser.newPage();

    for (let i = 1; i <= USER_COUNT; i++) {
        const email = `${BASE_NAME}${i}@example.com`;
        const firstName = `First${i}`;
        const lastName = `Last${i}`;

        console.log(`\n[User ${i}/${USER_COUNT}] Processing ${email}...`);

        try {
            // 1. Go to Login/Signup Page
            await page.goto(TARGET_URL);

            // Check if we are already logged in (if previous logout failed)
            const logoutBtn = await page.$('text/Logout');
            if (logoutBtn) {
                console.log('  - Found residual session, logging out...');
                await logoutBtn.click();
                await page.waitForNavigation();
            }

            // 2. Navigate to Sign Up
            // Wait for "Don't have an account? Sign Up" button or link
            // Adjust selector based on your valid UI. currently it's "Sign Up" text text
            const signUpLink = await page.waitForSelector('div[role="button"]', { timeout: 2000 }).catch(() => null);
            // Actually, we need to find the specific "Sign Up" toggle text or button.
            // Let's assume the user starts at Login.

            // Wait for input fields to ensure page load
            await page.waitForSelector('input[placeholder="Email"]');

            // Click "Sign Up" toggle if we are in Login mode
            // We can look for text "Sign Up"
            const handles = await page.$$('div');
            let signUpClicked = false;
            for (const h of handles) {
                const text = await page.evaluate(el => el.textContent, h);
                if (text === 'Sign Up') {
                    await h.click();
                    signUpClicked = true;
                    break;
                }
            }

            if (!signUpClicked) {
                // Maybe it's a specific class? Let's try filling first.
            }

            // Fill Sign Up Form
            // We need to type into inputs.
            // Inputs: First Name, Last Name, Email, Password
            await page.type('input[placeholder="First Name"]', firstName);
            await page.type('input[placeholder="Last Name"]', lastName);
            await page.type('input[placeholder="Email"]', email);
            await page.type('input[placeholder="Password"]', PASSWORD);

            // 3. Submit
            // Find "Sign Up" button. It likely says "Sign Up" and is different from the toggle.
            // The button usually has a background color.
            const buttons = await page.$$('div[role="button"]');
            for (const b of buttons) {
                const t = await page.evaluate(el => el.textContent, b);
                if (t === 'Sign Up') {
                    await b.click();
                    break;
                }
            }

            // 4. Wait for Home Screen (redirect)
            // Look for "TAP TO JOIN" or "Next Game"
            await page.waitForFunction(
                () => document.body.textContent.includes('TAP TO JOIN') || document.body.textContent.includes('VOTED'),
                { timeout: 10000 }
            );
            console.log('  - Signed up successfully.');

            // 5. Vote
            // Click "TAP TO JOIN"
            // It might already be voted if we are re-using accounts, but these are new.
            const voteBtn = await page.$x("//div[contains(text(), 'TAP TO JOIN')]");
            if (voteBtn.length > 0) {
                await voteBtn[0].click();
                console.log('  - Clicked Vote button.');

                // Wait for status to change to "VOTED" or "JOINED"
                // Or wait for an alert? The app uses Alert.alert which might block puppeteer?
                // React Native Web Alert usually uses window.alert?
                // If it uses window.alert, we need to handle dialog.

                page.on('dialog', async dialog => {
                    // console.log('  - Dialog:', dialog.message());
                    await dialog.accept();
                });

                await new Promise(r => setTimeout(r, 2000)); // Wait a bit for processing
            } else {
                console.log('  - Vote button not found (already voted?)');
            }

            // 6. Logout
            // Try different selectors for logout
            let logout = await page.$x("//div[contains(text(), 'Logout')]");
            if (logout.length === 0) {
                logout = await page.$x("//button[contains(text(), 'Logout')]");
            }
            if (logout.length > 0) {
                await logout[0].click();
                console.log('  - Logged out.');
                await new Promise(r => setTimeout(r, 1000));
            } else {
                console.log('  - Logout button not found. User might be stuck logged in.');
            }
        } catch (e) {
            console.error(`  [!] Failed for user ${i}:`, e.message);
            // Try to recover by going back to base url
            await page.goto(TARGET_URL);
        }
    }

    console.log('\n[Test] Automation Complete.');
    await browser.close();
})();
