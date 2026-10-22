import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { captureRedirects, decodeRedirect } from './redirect';

function readFixture(filename: string): string {
	return fs.readFileSync(path.join(__dirname, 'pages', filename), 'utf8');
}

async function openGitLab(page: Page, url: string, html: string): Promise<void> {
	await page
		.context()
		.route('https://gitlab.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
	await captureRedirects(page);
	await page.goto(url);
}

test('GitLab repository action uses the evidenced Code download list and preserves its remote', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await openGitLab(page, 'https://gitlab.com/gitlab-org/gitlab', readFixture('gitlab-repository.html'));
	await page.getByRole('button', { name: 'Code', exact: true }).click();
	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	await expect(page.locator('[data-gk-action="open"][data-gk-slot="gitlab-repository-code"]')).toHaveCount(1);
	// the action joins the flat list that holds the archive links
	await expect(
		page.locator('ul:has(a[href^="/gitlab-org/gitlab/-/archive/"]) > [data-gk-owner="gitlab"]'),
	).toHaveCount(1);
	const href = (await action.getAttribute('href'))!;
	const { outer, inner } = decodeRedirect(href);
	expect(outer.searchParams.get('referrer')).toBe('extension');
	expect(inner.pathname).toBe('/link/r/-');
	expect(inner.searchParams.get('url')).toBe('https://gitlab.com/gitlab-org/gitlab.git');

	const popupPromise = page.waitForEvent('popup');
	await action.press('Enter');
	const popup = await popupPromise;
	await expect(popup).toHaveURL(href);
	await popup.close();
});

test('GitLab merge request actions join the first group of the Code dropdown', async ({ page, extensionId }) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await openGitLab(
		page,
		'https://gitlab.com/gitlab-org/gitlab/-/merge_requests/1',
		readFixture('gitlab-merge-request.html'),
	);
	await page.getByRole('button', { name: 'Code', exact: true }).click();

	const firstGroup = page.locator(
		'[data-testid="mr-code-dropdown"] ul[data-testid="disclosure-content"] > li:first-child > ul',
	);
	await expect(firstGroup.locator('> [data-gk-owner="gitlab"]')).toHaveCount(2);
	await expect(page.locator('[data-gk-owner="gitlab"]')).toHaveCount(2);
	await expect(firstGroup.locator('> li').nth(2)).toHaveAttribute('data-gk-slot', 'gitlab-merge-request-code');
	await expect(firstGroup.locator('> li').nth(3)).toHaveAttribute(
		'data-gk-slot',
		'gitlab-merge-request-code-compare',
	);

	const open = firstGroup.getByRole('link', { name: 'Open with GitKraken', exact: true });
	const compare = firstGroup.getByRole('link', { name: 'Open Comparison with GitKraken', exact: true });
	await expect(open).toBeVisible();
	await expect(compare).toBeVisible();
	for (const link of [open, compare]) {
		const { outer, inner } = decodeRedirect((await link.getAttribute('href'))!);
		expect(outer.searchParams.get('referrer')).toBe('extension');
		expect(outer.searchParams.get('context')).toBe('pr');
		expect(inner.searchParams.get('url')).toBe('https://gitlab.com/gitlab-org/gitlab.git');
		expect(inner.searchParams.get('pr')).toBe('1');
		expect(inner.searchParams.get('prUrl')).toBe('https://gitlab.com/gitlab-org/gitlab/-/merge_requests/1');
	}
});

test('GitLab merge request actions still use the legacy dropdown on self-managed versions', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	const legacy = `<!doctype html><html><head><meta charset="utf-8" /><title>Merge request</title></head><body>
		<div class="merge-request"><div class="dropdown-menu"><div class="gl-dropdown-inner">
			<ul><li class="gl-dropdown-item"><a class="dropdown-item" href="/gitlab-org/gitlab/-/merge_requests/1.diff">Plain diff</a></li></ul>
		</div></div></div>
	</body></html>`;
	await openGitLab(page, 'https://gitlab.com/gitlab-org/gitlab/-/merge_requests/1', legacy);

	const open = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	const compare = page.getByRole('link', { name: 'Open Comparison with GitKraken', exact: true });
	await expect(open).toHaveCount(1);
	await expect(compare).toHaveCount(1);
	await expect(page.locator('.merge-request .gl-dropdown-inner')).toHaveCSS('max-height', '400px');
	expect(decodeRedirect((await open.getAttribute('href'))!).inner.searchParams.get('url')).toBe(
		'https://gitlab.com/gitlab-org/gitlab.git',
	);
	expect(decodeRedirect((await compare.getAttribute('href'))!).inner.searchParams.get('pr')).toBe('1');
});
