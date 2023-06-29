import path from 'path';
import type { BrowserContext } from '@playwright/test';
import { test as base, chromium } from '@playwright/test';

// overwrite the default playwright test to launch chrome with a persistent context, which enables the extension
export const test = base.extend<{
    context: BrowserContext;
    extensionId: string;
}>({
    // eslint-disable-next-line no-empty-pattern
    context: async ({ }, use) => {
        const pathToExtension = path.join(__dirname, '../../');
        const context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--headless=new`, // the new headless arg for chrome v109+. Use '--headless=chrome' as arg for browsers v94-108.
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
            ],
        });
        await use(context);
        await context.close();
    },
    extensionId: async ({ context }, use) => {
        // for manifest v3:
        let [background] = context.serviceWorkers();
        if (!background) {
            background = await context.waitForEvent('serviceworker');
        }

        const extensionId = background.url().split('/')[2];
        await use(extensionId);
    },
});
export const expect = test.expect;
