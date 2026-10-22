import fs from 'fs';
import path from 'path';
import type { BrowserContext } from '@playwright/test';
import { test as base, chromium } from '@playwright/test';

// overwrite the default playwright test to launch chrome with a persistent context, which enables the extension
export const test = base.extend<{
	context: BrowserContext;
	extensionId: string;
}>({
	// eslint-disable-next-line no-empty-pattern
	context: async ({}, use) => {
		const pathToExtension = path.join(__dirname, '../../');
		const manifestPath = path.join(pathToExtension, 'manifest.json');
		const backgroundPath = path.join(pathToExtension, 'dist/background.js');
		if (!fs.existsSync(manifestPath) || !fs.existsSync(backgroundPath)) {
			throw new Error('Build the Chromium extension before running browser tests.');
		}

		const context = await chromium.launchPersistentContext('', {
			headless: false,
			args: [
				`--headless=new`, // the new headless arg for chrome v109+. Use '--headless=chrome' for browsers v94-108.
				`--disable-extensions-except=${pathToExtension}`,
				`--load-extension=${pathToExtension}`,
			],
		});
		try {
			await use(context);
		} finally {
			await context.close();
		}
	},
	extensionId: async ({ context }, use) => {
		// for manifest v3:
		const background =
			context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker', { timeout: 10_000 }));

		const extensionId = background.url().split('/')[2];
		await use(extensionId);
	},
});
export const expect = test.expect;
