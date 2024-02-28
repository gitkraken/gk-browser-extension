import type { WebNavigation } from 'webextension-polyfill';
import { runtime, scripting , tabs, webNavigation } from 'webextension-polyfill';
import { fetchUser } from './gkApi';
import { injectionScope as inject_azureDevops } from './hosts/azureDevops';
import { injectionScope as inject_bitbucket } from './hosts/bitbucket';
import { injectionScope as inject_github } from './hosts/github';
import { injectionScope as inject_gitlab } from './hosts/gitlab';
import { refreshPermissions } from './permissions-helper';
import { PopupInitMessage } from './shared';

webNavigation.onDOMContentLoaded.addListener(injectScript, {
	url: [
		{ hostContains: 'github.com' },
		{ hostContains: 'gitlab.com' },
		{ hostContains: 'bitbucket.org' },
		{ hostContains: 'dev.azure.com' },
	],
});

webNavigation.onHistoryStateUpdated.addListener(details => {
	// used to detect when the user navigates to a different page in the same tab
	const url = new URL(details.url);
	if (url.host === 'bitbucket.org' || url.host === 'dev.azure.com') {
		tabs.sendMessage(details.tabId, {
			message: 'onHistoryStateUpdated',
			details: details,
		}).catch(console.error);
	}
});

runtime.onMessage.addListener(async (msg) => {
	if (msg === PopupInitMessage) {
		return refreshPermissions();
	}
	console.error('Recevied unknown runtime message', msg);
	return undefined;
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

	if (uri.hostname.endsWith('dev.azure.com')) {
		return inject_azureDevops;
	}

	console.error('Unsupported host');
	throw new Error('Unsupported host');
}

const main = async () => {
	// The fetchUser function also updates the extension icon if the user is logged in
	await fetchUser();

	// This removes unneded permissions
	await refreshPermissions();
};

void main();
