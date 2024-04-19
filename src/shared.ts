import { action, storage } from 'webextension-polyfill';
import { fetchProviderConnections } from './gkApi';
import type {
	CacheContext,
	CachedFetchResponse,
	EnterpriseProviderConnection,
	ProviderConnection,
	SessionCacheKey,
} from './types';

declare const MODE: 'production' | 'development' | 'none';

export const PopupInitMessage = 'popupInit';
export const PermissionsGrantedMessage = 'permissionsGranted';

const IconPaths = {
	Grey: {
		16: '/icons/gk-grey-16.png',
		32: '/icons/gk-grey-32.png',
		48: '/icons/gk-grey-48.png',
		128: '/icons/gk-grey-128.png',
	},
	Green: {
		16: '/icons/gk-green-16.png',
		32: '/icons/gk-green-32.png',
		48: '/icons/gk-green-48.png',
		128: '/icons/gk-green-128.png',
	},
};

export const GKDotDevUrl = MODE === 'production' ? 'https://gitkraken.dev' : 'https://dev.gitkraken.dev';

export const CloudProviders = ['github.com', 'gitlab.com', 'bitbucket.org', 'dev.azure.com'];

export const updateExtensionIcon = (isLoggedIn: boolean) =>
	action.setIcon({ path: isLoggedIn ? IconPaths.Green : IconPaths.Grey });

// Basically ramda's difference() function but it accepts undefined as empty arrays
export function arrayDifference<T>(first: T[] | undefined, second: T[] | undefined): T[] {
	if (!first) {
		return [];
	}
	if (!second) {
		return first;
	}
	return first.filter(x => !second.includes(x));
}

function ensureDomain(value: string): string {
	// Check if value is a URL or actually a domain
	try {
		const url = new URL(value);
		return url.hostname;
	} catch (e) {
		// Not a valid URL, so it's probably a domain
		if (!(e instanceof TypeError)) {
			console.error('Unexpected error constructing URL', e);
		}
	}
	return value;
}

async function cacheOnContext<K extends keyof CacheContext>(
	cache: CacheContext,
	key: K,
	fn: () => Promise<CacheContext[K] | undefined>,
): ReturnType<typeof fn> {
	if (cache[key]) {
		return cache[key];
	}
	const result = await fn();
	if (result !== undefined) {
		cache[key] = result;
	}
	return result;
}

function isEnterpriseProviderConnection(connection: ProviderConnection): connection is EnterpriseProviderConnection {
	return Boolean(['githubEnterprise', 'gitlabSelfHosted'].includes(connection.provider) && connection.domain);
}

export async function getEnterpriseConnections(context: CacheContext) {
	return cacheOnContext(context, 'enterpriseConnectionsCache', async () => {
		const providerConnections = await fetchProviderConnections();
		if (!providerConnections) {
			return;
		}
		// note: GitLab support comes later
		const enterpriseConnections = providerConnections.filter(isEnterpriseProviderConnection).map(
			// typing is weird here, but we need to ensure domain is actually a domain
			(connection: EnterpriseProviderConnection): EnterpriseProviderConnection => ({
				...connection,
				domain: ensureDomain(connection.domain),
			}),
		);
		return enterpriseConnections;
	});
}

export const DefaultCacheTimeMinutes = 30;

export const sessionCachedFetch = async <T>(
	key: SessionCacheKey,
	cacheTimeMinutes: number,
	fetchFn: () => Promise<T>,
) => {
	const sessionStorage = await storage.session.get(key);
	const data = sessionStorage[key] as CachedFetchResponse<T> | undefined;
	if (data && data.timestamp > Date.now() - cacheTimeMinutes * 60 * 1000) {
		return data.data;
	}

	const newData = await fetchFn();
	if (newData) {
		await storage.session.set({ [key]: { data: newData, timestamp: Date.now() } });
	}

	return newData;
};
