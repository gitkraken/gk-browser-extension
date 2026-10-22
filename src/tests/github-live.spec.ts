import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { captureRedirects, decodeRedirect, redirectOrigin } from './redirect';

async function openRepositoryCodeMenu(page: Page, url: string): Promise<void> {
	await captureRedirects(page);
	await page.goto(url);
	await page.getByRole('button', { name: 'Code', exact: true }).click();
}

for (const route of ['', '/tree/main']) {
	test(`live GitHub ${route || 'root'} Code menu opens the current repository redirect`, async ({
		page,
		extensionId,
	}) => {
		expect(extensionId).toMatch(/^[a-p]{32}$/);
		await openRepositoryCodeMenu(page, `https://github.com/microsoft/vscode${route}`);
		const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
		await expect(action).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('[data-gk-slot="github-repository-code"]')).toHaveCount(1);
		const href = (await action.getAttribute('href'))!;
		const { outer, inner } = decodeRedirect(href);
		expect(outer.origin).toBe(redirectOrigin);
		expect(inner.searchParams.get('url')).toBe('https://github.com/microsoft/vscode.git');

		const popupPromise = page.waitForEvent('popup');
		await action.click();
		const popup = await popupPromise;
		await popup.waitForLoadState('domcontentloaded');
		await expect(popup).toHaveURL(href);
		await popup.close();
	});
}

test('live GitHub commit page injects one stable action that opens the commit redirect', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await captureRedirects(page);
	// remember when an injected node was last added or removed, wherever in the page
	await page.addInitScript(() => {
		const tracker = window as unknown as { __gkLastChange?: number };
		new MutationObserver(records => {
			for (const record of records) {
				for (const node of [...record.addedNodes, ...record.removedNodes]) {
					if (
						node instanceof Element &&
						(node.matches('[data-gk-owner]') || node.querySelector('[data-gk-owner]'))
					) {
						tracker.__gkLastChange = performance.now();
					}
				}
			}
		}).observe(document, { childList: true, subtree: true });
	});
	await page.goto('https://github.com/gitkraken/vscode-gitlens/commit/beb503ae81303d63abb821f2b0c66e41633b4705');
	const owned = page.locator('[data-gk-owner="github"]');
	await expect(owned).toHaveCount(1, { timeout: 15_000 });

	// GitHub may swap a container once while it hydrates, but a re-insertion loop never goes quiet
	const sinceLastChange = () =>
		page.evaluate(
			() => performance.now() - ((window as unknown as { __gkLastChange?: number }).__gkLastChange ?? 0),
		);
	await expect.poll(sinceLastChange, { timeout: 15_000 }).toBeGreaterThan(1000);

	const before = (await owned.elementHandle())!;
	const href = (await owned.getAttribute('href'))!;
	const { outer, inner } = decodeRedirect(href);
	expect(outer.origin).toBe(redirectOrigin);
	expect(inner.pathname).toBe('/link/r/-/c/beb503ae81303d63abb821f2b0c66e41633b4705');

	await page.waitForTimeout(1000);
	await expect(owned).toHaveCount(1);
	const after = (await owned.elementHandle())!;
	expect(await before.evaluate(node => node.isConnected)).toBe(true);
	expect(await page.evaluate(([first, second]) => first === second, [before, after])).toBe(true);
});
