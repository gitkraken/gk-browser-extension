import fs from 'fs';
import path from 'path';
import { expect, test } from './fixtures';
import { captureRedirects, decodeRedirect } from './redirect';

const rootUrl = 'https://github.com/microsoft/vscode';
const rootFixture = path.join(__dirname, 'pages/github-repository.html');
const pullFixture = path.join(__dirname, 'pages/github-pull.html');

async function openFixture(
	page: import('@playwright/test').Page,
	pathname = '/microsoft/vscode',
	pull = false,
): Promise<void> {
	const html = fs.readFileSync(pull ? pullFixture : rootFixture, 'utf8');
	await page.context().route('https://github.com/**', route => {
		if (new URL(route.request().url()).pathname !== pathname) {
			return route.fulfill({ status: 404, body: 'fixture route not found' });
		}
		return route.fulfill({ status: 200, contentType: 'text/html', body: html });
	});
	await page.goto(`https://github.com${pathname}`);
}

test('GitHub menu remounts and falls back to the repository archive when the action label changes', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await openFixture(page);
	await page.evaluate(() => {
		const list = document.querySelector('#repository-actions')!;
		list.setAttribute('aria-label', 'Repository actions (localized)');
		const decoy = document.createElement('ul');
		decoy.setAttribute('aria-label', 'Repository actions');
		decoy.innerHTML = '<li><a href="/unrelated/decoy/archive/refs/heads/main.zip">Download archive</a></li>';
		document.querySelector('main')!.append(decoy);
		const wrapper = document.createElement('section');
		wrapper.className = 'host-layout-update';
		list.replaceWith(wrapper);
		wrapper.append(list);
	});
	await page.getByRole('button', { name: 'Code', exact: true }).click();
	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	await expect(page.locator('[data-gk-slot="github-repository-code"]')).toHaveCount(1);
	await expect(page.locator('[aria-label="Repository actions (localized)"] [data-gk-owner="github"]')).toHaveCount(1);

	await page.locator('[aria-label="Repository actions (localized)"]').evaluate(list => list.remove());
	await expect(page.locator('[data-gk-owner="github"]')).toHaveCount(0);
	await page.locator('main').evaluate(main => {
		const menu = document.createElement('ul');
		menu.setAttribute('aria-label', 'Repository actions');
		menu.className = 'new-host-class';
		menu.innerHTML = '<li><a href="/microsoft/vscode/archive/refs/heads/main.zip">Download archive</a></li>';
		main.append(menu);
	});
	await expect(page.locator('[data-gk-slot="github-repository-code"]')).toHaveCount(1);
	await expect(page.locator('ul[aria-label="Repository actions"] [data-gk-owner="github"]')).toHaveCount(1);
});

test('GitHub late Code menu appears and the active repository URL refreshes across SPA navigation', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	const html = fs.readFileSync(rootFixture, 'utf8').replace(/\s*<ul\s+id="repository-actions"[\s\S]*?<\/ul>/, '');
	await page
		.context()
		.route('https://github.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
	await page.goto(rootUrl);
	await page.getByRole('button', { name: 'Code', exact: true }).click();
	await expect(page.locator('[data-gk-owner="github"]')).toHaveCount(0);

	await page.locator('main').evaluate(main => {
		const menu = document.createElement('ul');
		menu.id = 'repository-actions';
		menu.setAttribute('aria-label', 'Repository actions');
		menu.innerHTML = '<li><a href="/microsoft/vscode/archive/refs/heads/main.zip">Download ZIP</a></li>';
		main.append(menu);
	});
	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	const initialPayload = decodeRedirect((await action.getAttribute('href'))!).inner;
	expect(initialPayload.searchParams.get('url')).toBe('https://github.com/microsoft/vscode.git');

	await page.evaluate(() => {
		history.pushState({}, '', '/microsoft/other');
		for (const link of document.querySelectorAll('header a[href="/microsoft/vscode"]')) {
			link.setAttribute('href', '/microsoft/other');
		}
		document
			.querySelector('#repository-actions a[href*="/archive/"]')!
			.setAttribute('href', '/microsoft/other/archive/refs/heads/main.zip');
	});
	await expect
		.poll(async () => decodeRedirect((await action.getAttribute('href'))!).inner.searchParams.get('url'))
		.toBe('https://github.com/microsoft/other.git');
	await expect(page.locator('[data-gk-slot="github-repository-code"]')).toHaveCount(1);

	await page.evaluate(() => {
		history.pushState({}, '', '/orgs/microsoft');
	});
	await expect(page.locator('[data-gk-owner="github"]')).toHaveCount(0);
});

test('GitHub restores a missing PR sibling action without duplicating its surviving action', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await openFixture(page, '/microsoft/vscode/pull/42', true);
	await page.getByRole('button', { name: 'Code', exact: true }).click();
	await expect(page.locator('#local-checkout-options [data-gk-owner="github"]')).toHaveCount(2);
	await page.locator('[data-gk-slot="github-pull-compare"]').evaluate(element => element.remove());
	await expect(page.locator('#local-checkout-options [data-gk-slot="github-pull-compare"]')).toHaveCount(1);
	await expect(page.locator('#local-checkout-options [data-gk-slot="github-pull-open"]')).toHaveCount(1);
});

test('GitHub ignores archive links outside the Code menu', async ({ page, extensionId }) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	const html = fs.readFileSync(rootFixture, 'utf8').replace(/\s*<ul\s+id="repository-actions"[\s\S]*?<\/ul>/, '');
	await page
		.context()
		.route('https://github.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
	await captureRedirects(page);
	await page.goto(rootUrl);
	await expect(page.locator('style[data-gk-style="github-actions"]')).toHaveCount(1);

	// release-style assets list: same repository archive links, but not in a Code menu
	await page.locator('main').evaluate(main => {
		const assets = document.createElement('ul');
		assets.innerHTML = '<li><a href="/microsoft/vscode/archive/refs/tags/1.0.0.zip">Source code (zip)</a></li>';
		main.append(assets);
	});
	await page.waitForTimeout(1000);
	await expect(page.locator('[data-gk-owner]')).toHaveCount(0);

	// the same list inside the portal root is a Code menu
	await page.locator('#__primerPortalRoot__').evaluate(root => {
		const menu = document.createElement('ul');
		menu.innerHTML = '<li><a href="/microsoft/vscode/archive/refs/heads/main.zip">Download ZIP</a></li>';
		root.append(menu);
	});
	await expect(page.locator('#__primerPortalRoot__ [data-gk-slot="github-repository-code"]')).toHaveCount(1);
	await expect(page.locator('[data-gk-owner]')).toHaveCount(1);
});

test('GitHub PR menu falls back to the React code-button list', async ({ page, extensionId }) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await openFixture(page, '/microsoft/vscode/pull/42', true);
	// The previous React Code menu shape, without the "Local checkout options" label
	await page.evaluate(() => {
		document.querySelector('#local-checkout-options')!.remove();
		const root = document.createElement('div');
		root.id = '__primerPortalRoot__';
		root.innerHTML = '<div class="react-overview-code-button-action-list"></div>';
		const outer = document.createElement('ul');
		const inner = document.createElement('ul');
		inner.id = 'react-checkout-options';
		inner.innerHTML = '<li><button type="button">Checkout with GitHub Desktop</button></li>';
		outer.append(inner);
		root.firstElementChild!.append(outer);
		document.body.append(root);
	});
	await expect(page.locator('#react-checkout-options [data-gk-owner="github"]')).toHaveCount(2);
	await expect(page.locator('#react-checkout-options [data-gk-slot="github-pull-open"]')).toHaveCount(1);
	await expect(page.locator('#react-checkout-options [data-gk-slot="github-pull-compare"]')).toHaveCount(1);
});
