import type { WebNavigation } from 'webextension-polyfill';
import { scripting, webNavigation } from 'webextension-polyfill';
import { injectionScope as inject_bitbucket } from './hosts/bitbucket';
import { injectionScope as inject_github } from './hosts/github';
import { injectionScope as inject_gitlab } from './hosts/gitlab';

webNavigation.onDOMContentLoaded.addListener(injectScript, {
	url: [{ hostContains: 'github.com' }, { hostContains: 'gitlab.com' }, { hostContains: 'bitbucket.org' }],
});

function injectScript(details: WebNavigation.OnDOMContentLoadedDetailsType) {
	void scripting.executeScript({
		target: { tabId: details.tabId },
		// injectImmediately: true,
		func: getInjectionFn(details.url),
		args: [details.url],
	});
}

function getInjectionFn(url: string): (url: string) => void {
	const uri = new URL(url);
	if (uri.hostname.endsWith('github.com')) {
		return inject_github;
	}

	if (uri.hostname.endsWith('gitlab.com')) {
		return inject_gitlab;
	}

	if (uri.hostname.endsWith('bitbucket.org')) {
		return inject_bitbucket;
	}

	console.error('Unsupported host');
	throw new Error('Unsupported host');
}
