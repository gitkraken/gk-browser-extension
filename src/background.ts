import type { WebNavigation } from 'webextension-polyfill';
import { runtime, scripting, tabs, webNavigation } from 'webextension-polyfill';
import { fetchUser } from './gkApi';
import { injectionScope as inject_azureDevops } from './hosts/azureDevops';
import { injectionScope as inject_bitbucket } from './hosts/bitbucket';
import { injectionScope as inject_github } from './hosts/github';
import { injectionScope as inject_gitlab } from './hosts/gitlab';
import { refreshPermissions } from './permissions-helper';
import { getEnterpriseConnections, PermissionsGrantedMessage, PopupInitMessage } from './shared';
import type { CacheContext } from './types';
import { Provider } from './types';

interface InjectionDomains {
	github: string[];
	gitlab: string[];
	bitbucket: string[];
	azureDevops: string[];
}

const DefaultInjectionDomains: InjectionDomains = {
	github: ['github.com'],
	gitlab: ['gitlab.com'],
	bitbucket: ['bitbucket.org'],
	azureDevops: ['dev.azure.com'],
};

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

runtime.onMessage.addListener(async msg => {
	if (msg === PopupInitMessage) {
		const context: CacheContext = {};
		return refreshPermissions(context);
	} else if (msg === PermissionsGrantedMessage) {
		// Reload extension to update injection listener
		runtime.reload();
		return undefined;
	}
	console.error('Recevied unknown runtime message', msg);
	return undefined;
});

async function computeInjectionDomains(context: CacheContext) {
	const injectionDomains = structuredClone(DefaultInjectionDomains);
	const enterpriseConnections = await getEnterpriseConnections(context);
	if (enterpriseConnections) {
		for (const connection of enterpriseConnections) {
			if (connection.provider === Provider.GITHUB_ENTERPRISE) {
				injectionDomains.github.push(connection.domain);
			}
			if (connection.provider === Provider.GITLAB_SELF_HOSTED) {
				injectionDomains.gitlab.push(connection.domain);
			}
		}
	}
	return injectionDomains;
}

async function addInjectionListener(context: CacheContext) {
	const injectionDomains = await computeInjectionDomains(context);
	const allDomains = Object.values<string[]>(injectionDomains as any).flat();

	// note: This is a closure over injectionDomains
	const injectScript = (details: WebNavigation.OnDOMContentLoadedDetailsType) => {
		void scripting.executeScript({
			target: { tabId: details.tabId },
			// injectImmediately: true,
			func: getInjectionFn(details.url, injectionDomains),
			args: [details.url],
		});
	};

	webNavigation.onDOMContentLoaded.addListener(injectScript, {
		url: allDomains.map(domain => ({ hostContains: domain })),
	});
}

function urlHostHasDomain(url: URL, domains: string[]): boolean {
	return domains.some(domain => url.hostname.endsWith(domain));
}

function getInjectionFn(rawUrl: string, injectionDomains: InjectionDomains): (url: string) => void {
	const url = new URL(rawUrl);
	if (urlHostHasDomain(url, injectionDomains.github)) {
		return inject_github;
	}

	if (urlHostHasDomain(url, injectionDomains.gitlab)) {
		return inject_gitlab;
	}

	if (urlHostHasDomain(url, injectionDomains.bitbucket)) {
		return inject_bitbucket;
	}

	if (urlHostHasDomain(url, injectionDomains.azureDevops)) {
		return inject_azureDevops;
	}

	console.error('Unsupported host');
	throw new Error('Unsupported host');
}

async function main() {
	// The fetchUser function also updates the extension icon if the user is logged in
	await fetchUser();

	const context: CacheContext = {};
	// This removes unneded permissions
	await refreshPermissions(context);
	// NOTE: This may request hosts that we may not have permissions for, which will log errors for the extension
	// This does not cause any issues, and eliminating the errors requires more logic
	await addInjectionListener(context);
}

void main();
