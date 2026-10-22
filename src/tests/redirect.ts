import type { Page } from '@playwright/test';

export const redirectOrigin = process.env.GK_TEST_REDIRECT_ORIGIN ?? 'https://dev.gitkraken.dev';

// Answers the extension's gitkraken.dev links locally so tests never make a real request to the redirect service
export async function captureRedirects(page: Page): Promise<void> {
	await page
		.context()
		.route(`${redirectOrigin}/link/**`, route =>
			route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Redirect captured</title>' }),
		);
}

export function decodeRedirect(href: string): { outer: URL; inner: URL } {
	const outer = new URL(href);
	const encoded = outer.pathname.split('/').filter(Boolean).at(-1)!;
	const inner = new URL(Buffer.from(decodeURIComponent(encoded), 'base64').toString('utf8'));
	return { outer: outer, inner: inner };
}
