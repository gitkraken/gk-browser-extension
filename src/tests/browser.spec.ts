import { expect, test } from './fixtures';

// chrome extension tests
test('should create a link to open a repository in the repo page', async ({ page }) => {
	// get browser context to handle new tabs
	const context = page.context();

	// go to the vscode github page
	await page.goto('https://github.com/microsoft/vscode');

	// open up the Code tab
	await page.locator('#repo-content-pjax-container').getByText('Code', { exact: true }).click();

	const pagePromise = context.waitForEvent('page');
	await page.getByRole('link', { name: 'Open with GitKraken' }).click();
	const newPage = await pagePromise;
	await newPage.waitForLoadState();
	expect(newPage.url()).toBe(
		'https://dev.gk-links.pages.dev/link/dnNjb2RlOi8vZWFtb2Rpby5naXRsZW5zL2xpbmsvci8tP3VybD1odHRwcyUzQSUyRiUyRmdpdGh1Yi5jb20lMkZtaWNyb3NvZnQlMkZ2c2NvZGUuZ2l0',
	);
});

test.skip('should create a link to open a branch for a PR', async ({ page }) => {
	// this feature requires an account
	// todo: set up 2fa for a test github account to get a consistent login

	// get browser context to handle new tabs
	const context = page.context();

	// go to the vscode github page
	await page.goto('https://github.com/miggy-e/test123/pull/15');

	// open up the Code tab
	// todo: run this to get the correct button selector
	await page.getByText('Checkout with GitKraken', { exact: true }).click();

	const pagePromise = context.waitForEvent('page');
	await page.getByRole('link', { name: 'Checkout with GitKraken' }).click();
	const newPage = await pagePromise;
	await newPage.waitForLoadState();
	// todo: get the correct url
	expect(newPage.url()).toBe(
		'https://dev.gk-links.pages.dev/link/dnNjb2RlOi8vZWFtb2Rpby5naXRsZW5zL2xpbmsvci8tP3VybD1odHRwcyUzQSUyRiUyRmdpdGh1Yi5jb20lMkZtaWNyb3NvZnQlMkZ2c2NvZGUuZ2l0',
	);
});

test('should create a link to open a commit', async ({ page }) => {
	// get browser context to handle new tabs
	const context = page.context();

	// go to a commit page
	await page.goto('https://github.com/gitkraken/vscode-gitlens/commit/beb503ae81303d63abb821f2b0c66e41633b4705');

	// open up the Code tab

	const pagePromise = context.waitForEvent('page');
	await page.getByLabel('Open with GitKraken', { exact: true }).click();
	const newPage = await pagePromise;
	await newPage.waitForLoadState();
	expect(newPage.url()).toBe(
		'https://dev.gk-links.pages.dev/link/dnNjb2RlOi8vZWFtb2Rpby5naXRsZW5zL2xpbmsvci8tL2MvYmViNTAzYWU4MTMwM2Q2M2FiYjgyMWYyYjBjNjZlNDE2MzNiNDcwNT91cmw9aHR0cHMlM0ElMkYlMkZnaXRodWIuY29tJTJGZ2l0a3Jha2VuJTJGdnNjb2RlLWdpdGxlbnMuZ2l0',
	);
});
