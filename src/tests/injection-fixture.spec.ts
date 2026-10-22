import fs from 'fs';
import path from 'path';
import type { Page, Route } from '@playwright/test';
import { expect, test } from './fixtures';
import { captureRedirects, decodeRedirect, redirectOrigin } from './redirect';

const githubOrigin = 'https://github.com';
const commitUrl = `${githubOrigin}/gitkraken/vscode-gitlens/commit/beb503ae81303d63abb821f2b0c66e41633b4705`;
const fixtureDirectory = path.join(__dirname, 'pages');

function readFixture(filename: string): string {
	return fs.readFileSync(path.join(fixtureDirectory, filename), 'utf8');
}

// A fixture is either a page file or a function that derives a page from one
const pages: Record<string, string | (() => string)> = {
	'/microsoft/vscode': 'github-repository.html',
	// GitHub serves any casing of a repository, but its header links keep the canonical casing
	'/MICROSOFT/VSCODE': 'github-repository.html',
	'/karan/Projects': () => readFixture('github-repository.html').replace(/\/microsoft\/vscode/g, '/karan/Projects'),
	'/gitkraken/vscode-gitlens/commit/beb503ae81303d63abb821f2b0c66e41633b4705': 'github-commit.html',
	'/microsoft/vscode/compare/main...feature/demo': 'github-compare.html',
	'/microsoft/vscode/pull/42': 'github-pull.html',
	'/cli/cli/releases/tag/v2.103.0': 'github-release.html',
	// a route that is not a repository root or tree, but shows the same Code menu markup
	'/microsoft/vscode/blob/main/README.md': 'github-repository.html',
};

async function routeGitHubFixtures(route: Route): Promise<void> {
	const requestUrl = new URL(route.request().url());
	const fixture = pages[requestUrl.pathname];
	if (!fixture) {
		await route.fulfill({ status: 404, contentType: 'text/plain', body: 'No test fixture for this route' });
		return;
	}
	await route.fulfill({
		status: 200,
		contentType: 'text/html',
		body: typeof fixture === 'function' ? fixture() : readFixture(fixture),
	});
}

async function prepareGitHub(page: Page, url: string): Promise<void> {
	await page.context().route('https://github.com/**', routeGitHubFixtures);
	await captureRedirects(page);
	await page.goto(url);
}

interface BranchRef {
	name: string;
	// A branch without an href is not rendered as a link (e.g. a deleted branch)
	href?: string;
	tooltip: string;
}

// Live shape (2026-10-22): `base` and `head` are sibling links followed by tooltip spans, "from " follows the first
// tooltip with no whitespace before it, and the whole header is rendered twice (main header plus a sticky copy)
function pullRequestHeader(copy: string, base: BranchRef, head: BranchRef): string {
	const branch = (id: string, ref: BranchRef) =>
		`${
			ref.href
				? `<a href="${ref.href}" aria-describedby="${id}" data-component="BranchName">${ref.name}</a>`
				: `<span aria-describedby="${id}" data-component="BranchName">${ref.name}</span>`
		}<span id="${id}" role="tooltip">${ref.tooltip}</span>`;
	return `<div class="fgColor-muted d-flex flex-items-center summaryContainer__6Iz">Hawk Ticehurst (hawkticehurst) wants to merge 1 commit into<div class="d-flex flex-items-center gap-1 branches__3hqMzX">${branch(
		`${copy}-base`,
		base,
	)}from ${branch(
		`${copy}-head`,
		head,
	)}<button type="button">Copy head branch name to clipboard</button></div></div>`;
}

async function setPullRequestHeaders(page: Page, base: BranchRef, head: BranchRef): Promise<void> {
	await page.evaluate(
		({ main, sticky }) => {
			document.querySelector('#pr-header')!.innerHTML = main;
			document.querySelector('#pr-header-sticky')!.innerHTML = sticky;
		},
		{ main: pullRequestHeader('main', base, head), sticky: pullRequestHeader('sticky', base, head) },
	);
}

const mainBranch: BranchRef = { name: 'main', href: '/microsoft/vscode/tree/main', tooltip: 'microsoft/vscode:main' };

async function openPullRequestMenu(page: Page) {
	await prepareGitHub(page, `${githubOrigin}/microsoft/vscode/pull/42?tab=files`);
	await page.getByRole('button', { name: 'Code', exact: true }).click();
	const open = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	const compare = page.getByRole('link', { name: 'Open Comparison with GitKraken', exact: true });
	await expect(open).toBeVisible();
	await expect(compare).toBeVisible();
	return { open: open, compare: compare };
}

test('GitHub repository root injects one Code-menu action and its link opens the expected redirect', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await prepareGitHub(page, `${githubOrigin}/microsoft/vscode`);
	await page.getByRole('button', { name: 'Code', exact: true }).click();

	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	await expect(
		page.locator('#repository-actions [data-gk-action="open"][data-gk-slot="github-repository-code"]'),
	).toHaveCount(1);
	await expect(page.locator('#repository-actions [data-gk-owner="github"]')).toHaveCount(1);
	await expect(action).toHaveAttribute('target', '_blank');
	const href = (await action.getAttribute('href'))!;
	const { outer, inner } = decodeRedirect(href);
	expect(outer.origin).toBe(redirectOrigin);
	expect(outer.searchParams.get('referrer')).toBe('extension');
	expect(inner.protocol).toBe('vscode:');
	expect(inner.pathname).toBe('/link/r/-');
	expect(inner.searchParams.get('url')).toBe('https://github.com/microsoft/vscode.git');

	const popupPromise = page.waitForEvent('popup');
	await action.click();
	const popup = await popupPromise;
	await popup.waitForLoadState('domcontentloaded');
	await expect(popup).toHaveURL(href);
	await popup.close();
});

test('GitHub repository action supports keyboard activation', async ({ page, extensionId }) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await prepareGitHub(page, `${githubOrigin}/microsoft/vscode`);
	await page.getByRole('button', { name: 'Code', exact: true }).click();
	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	const href = await action.getAttribute('href');
	const popupPromise = page.waitForEvent('popup');
	await action.press('Enter');
	const popup = await popupPromise;
	await expect(popup).toHaveURL(href!);
	await popup.close();
});

test('GitHub repository action is injected for a repository whose name is also a GitHub route', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await prepareGitHub(page, `${githubOrigin}/karan/Projects`);
	await page.getByRole('button', { name: 'Code', exact: true }).click();
	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	await expect(page.locator('[data-gk-slot="github-repository-code"]')).toHaveCount(1);
	const { inner } = decodeRedirect((await action.getAttribute('href'))!);
	expect(inner.searchParams.get('url')).toBe('https://github.com/karan/Projects.git');
});

test('GitHub repository action is injected when the URL casing differs from the header links', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await prepareGitHub(page, `${githubOrigin}/MICROSOFT/VSCODE`);
	await page.getByRole('button', { name: 'Code', exact: true }).click();
	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	await expect(page.locator('[data-gk-slot="github-repository-code"]')).toHaveCount(1);
	const { inner } = decodeRedirect((await action.getAttribute('href'))!);
	expect(inner.searchParams.get('url')!.toLowerCase()).toBe('https://github.com/microsoft/vscode.git');
});

test('GitHub release pages do not get a repository action from their source archive links', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await prepareGitHub(page, `${githubOrigin}/cli/cli/releases/tag/v2.103.0`);
	// the content script has run once it adds its style element
	await expect(page.locator('style[data-gk-style="github-actions"]')).toHaveCount(1);
	await page.waitForTimeout(1000);
	await expect(page.locator('[data-gk-owner]')).toHaveCount(0);
});

test('GitHub non-tree repository routes do not get a Code-menu action even when a Code menu is present', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await prepareGitHub(page, `${githubOrigin}/microsoft/vscode/blob/main/README.md`);
	// the content script has run once it adds its style element
	await expect(page.locator('style[data-gk-style="github-actions"]')).toHaveCount(1);
	await page.getByRole('button', { name: 'Code', exact: true }).click();
	await expect(page.locator('ul[data-component="ActionList"][aria-label="Repository actions"]')).toBeVisible();
	await page.waitForTimeout(1000);
	await expect(page.locator('[data-gk-owner="github"]')).toHaveCount(0);
});

test('GitHub commit action opens the commit deep link', async ({ page, extensionId }) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await prepareGitHub(page, commitUrl);
	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	const href = (await action.getAttribute('href'))!;
	const { inner } = decodeRedirect(href);
	expect(inner.pathname).toBe('/link/r/-/c/beb503ae81303d63abb821f2b0c66e41633b4705');
	expect(inner.searchParams.get('url')).toBe('https://github.com/gitkraken/vscode-gitlens.git');

	const popupPromise = page.waitForEvent('popup');
	await action.click();
	const popup = await popupPromise;
	await popup.waitForLoadState('domcontentloaded');
	await expect(popup).toHaveURL(href);
	await popup.close();
});

test('GitHub commit action stays mounted instead of being re-inserted by its own mutations', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await prepareGitHub(page, commitUrl);
	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	const before = (await action.elementHandle())!;

	// count any injected node that is added or removed from here on
	await page.evaluate(() => {
		const churn = window as unknown as { __gkChurn: number };
		churn.__gkChurn = 0;
		new MutationObserver(records => {
			for (const record of records) {
				for (const node of [...record.addedNodes, ...record.removedNodes]) {
					if (
						node instanceof Element &&
						(node.matches('[data-gk-owner]') || node.querySelector('[data-gk-owner]'))
					) {
						churn.__gkChurn++;
					}
				}
			}
		}).observe(document.documentElement, { childList: true, subtree: true });
		// a host mutation makes the extension reconcile, as GitHub's constant re-rendering does
		document.body.append(document.createElement('div'));
	});
	await page.waitForTimeout(1000);

	expect(await page.evaluate(() => (window as unknown as { __gkChurn: number }).__gkChurn)).toBe(0);
	expect(await before.evaluate(node => node.isConnected)).toBe(true);
	const after = (await action.elementHandle())!;
	expect(await page.evaluate(([first, second]) => first === second, [before, after])).toBe(true);
	await expect(page.locator('[data-gk-owner="github"]')).toHaveCount(1);
});

test('GitHub compare action opens the selected comparison context', async ({ page, extensionId }) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	await prepareGitHub(page, `${githubOrigin}/microsoft/vscode/compare/main...feature/demo`);
	const action = page.getByRole('link', { name: 'Open with GitKraken', exact: true });
	await expect(action).toBeVisible();
	const { inner } = decodeRedirect((await action.getAttribute('href'))!);
	expect(inner.pathname).toBe('/link/r/-/compare/microsoft/vscode:main...microsoft/vscode:feature/demo');
	expect(inner.searchParams.get('url')).toBe('https://github.com/microsoft/vscode.git');
});

test('GitHub pull request actions preserve PR context and upgrade when fork branches appear', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	const { open, compare } = await openPullRequestMenu(page);
	await expect(page.locator('#local-checkout-options [data-gk-owner="github"]')).toHaveCount(2);

	const fallback = decodeRedirect((await open.getAttribute('href'))!);
	expect(fallback.outer.searchParams.get('context')).toBe('pr');
	expect(fallback.inner.searchParams.get('pr')).toBe('42');
	expect(fallback.inner.searchParams.get('prUrl')).toBe(`${githubOrigin}/microsoft/vscode/pull/42?tab=files`);
	expect(fallback.inner.pathname).toBe('/link/r/-');
	const oldOpenHref = await open.getAttribute('href');

	await setPullRequestHeaders(page, mainBranch, {
		name: 'feature/branch/test',
		href: '/octocat/vscode/tree/feature/branch/test',
		tooltip: 'octocat/vscode:feature/branch/test',
	});
	await expect.poll(async () => open.getAttribute('href')).not.toBe(oldOpenHref);
	const forkOpen = decodeRedirect((await open.getAttribute('href'))!);
	const forkCompare = decodeRedirect((await compare.getAttribute('href'))!);
	expect(forkOpen.inner.pathname).toBe('/link/r/-/b/feature/branch/test');
	expect(forkOpen.inner.searchParams.get('url')).toBe('https://github.com/octocat/vscode.git');
	expect(forkOpen.inner.searchParams.get('prRepoUrl')).toBe('https://github.com/microsoft/vscode.git');
	expect(forkCompare.inner.pathname).toBe(
		'/link/r/-/compare/microsoft/vscode:main...octocat/vscode:feature/branch/test',
	);
	expect(forkCompare.inner.searchParams.get('prUrl')).toBe(`${githubOrigin}/microsoft/vscode/pull/42?tab=files`);
});

test('GitHub pull request branch names stay percent-encoded in the redirect', async ({ page, extensionId }) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	const { open, compare } = await openPullRequestMenu(page);
	const oldOpenHref = await open.getAttribute('href');

	await setPullRequestHeaders(page, mainBranch, {
		name: 'fix#123',
		href: '/octocat/vscode/tree/fix%23123',
		tooltip: 'octocat/vscode:fix#123',
	});
	await expect.poll(async () => open.getAttribute('href')).not.toBe(oldOpenHref);
	const encodedOpen = decodeRedirect((await open.getAttribute('href'))!);
	const encodedCompare = decodeRedirect((await compare.getAttribute('href'))!);
	expect(encodedOpen.inner.pathname).toBe('/link/r/-/b/fix%23123');
	expect(encodedOpen.inner.hash).toBe('');
	expect(encodedCompare.inner.pathname).toBe('/link/r/-/compare/microsoft/vscode:main...octocat/vscode:fix%23123');
	expect(encodedCompare.inner.hash).toBe('');
});

test('GitHub pull request actions read the classic commit-ref markup', async ({ page, extensionId }) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	const { open, compare } = await openPullRequestMenu(page);
	const oldOpenHref = await open.getAttribute('href');

	// Classic and GitHub Enterprise Server markup; there are no BranchName links on the page
	await page.evaluate(() => {
		document.querySelector('#pr-header')!.innerHTML =
			'<span class="commit-ref base-ref"><a title="microsoft/vscode:release/1.95" href="/microsoft/vscode/tree/release/1.95"><span class="css-truncate-target">release/1.95</span></a></span>' +
			' <span class="commit-ref head-ref"><a title="octocat/vscode:feature/branch/test" href="/octocat/vscode/tree/feature/branch/test"><span class="css-truncate-target">feature/branch/test</span></a></span>';
	});
	await expect.poll(async () => open.getAttribute('href')).not.toBe(oldOpenHref);
	const classicOpen = decodeRedirect((await open.getAttribute('href'))!);
	const classicCompare = decodeRedirect((await compare.getAttribute('href'))!);
	expect(classicOpen.inner.pathname).toBe('/link/r/-/b/feature/branch/test');
	expect(classicOpen.inner.searchParams.get('url')).toBe('https://github.com/octocat/vscode.git');
	expect(classicOpen.inner.searchParams.get('prRepoUrl')).toBe('https://github.com/microsoft/vscode.git');
	expect(classicCompare.inner.pathname).toBe(
		'/link/r/-/compare/microsoft/vscode:release/1.95...octocat/vscode:feature/branch/test',
	);
});

test('GitHub pull request actions fall back to the PR link when the head branch is not a link', async ({
	page,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);
	const { open, compare } = await openPullRequestMenu(page);
	const oldOpenHref = (await open.getAttribute('href'))!;
	const oldCompareHref = (await compare.getAttribute('href'))!;

	// A deleted head branch is a plain span in both copies of the header, leaving only two links to the base branch
	await setPullRequestHeaders(page, mainBranch, { name: 'agents/x', tooltip: 'microsoft/vscode:agents/x' });
	await page.waitForTimeout(600);

	const deletedOpen = decodeRedirect((await open.getAttribute('href'))!);
	const deletedCompare = decodeRedirect((await compare.getAttribute('href'))!);
	// never a comparison of the base branch with itself
	expect(deletedCompare.inner.pathname).not.toContain('/compare/');
	expect(deletedOpen.inner.pathname).toBe('/link/r/-');
	expect(deletedOpen.inner.searchParams.get('pr')).toBe('42');
	expect(deletedCompare.inner.pathname).toBe('/link/r/-');
	expect(await open.getAttribute('href')).toBe(oldOpenHref);
	expect(await compare.getAttribute('href')).toBe(oldCompareHref);
});
