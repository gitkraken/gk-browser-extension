import { cookies, storage } from 'webextension-polyfill';
import { checkOrigins } from './permissions-helper';
import { DefaultCacheTimeMinutes, sessionCachedFetch, updateExtensionIcon } from './shared';
import type { Provider, ProviderConnection, ProviderToken, PullRequestDraftCounts, User } from './types';

declare const MODE: 'production' | 'development' | 'none';

const gkApiUrl = MODE === 'production' ? 'https://api.gitkraken.dev' : 'https://dev-api.gitkraken.dev';
const accessTokenCookieUrl = 'https://gitkraken.dev';
const accessTokenCookieName = MODE === 'production' ? 'accessToken' : 'devAccessToken';

const onLoggedOut = () => {
	void updateExtensionIcon(false);
	void storage.session.clear();
};

const getAccessToken = async () => {
	// Check if the user has granted permission to GitKraken.dev
	if (!(await checkOrigins(['gitkraken.dev']))) {
		// If not, just assume we're logged out
		onLoggedOut();
		return undefined;
	}

	// Attempt to get the access token cookie from GitKraken.dev
	const cookie = await cookies.get({
		url: accessTokenCookieUrl,
		name: accessTokenCookieName,
	});

	if (!cookie?.value) {
		onLoggedOut();
	}

	const { previousToken } = await storage.session.get('previousToken');
	if (cookie?.value !== previousToken) {
		await storage.session.clear();
		await storage.session.set({ previousToken: cookie?.value });
	}

	return cookie?.value;
};

export const fetchUser = async () => {
	const token = await getAccessToken();
	if (!token) {
		onLoggedOut();
		return null;
	}

	// Since the user object is unlikely to change, we can cache it for much longer than other data
	const user = await sessionCachedFetch('user', 60 * 12 /* 12 hours */, async () => {
		const res = await fetch(`${gkApiUrl}/user`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!res.ok) {
			return null;
		}

		return res.json() as Promise<User>;
	});

	if (!user) {
		onLoggedOut();
		return null;
	}

	void updateExtensionIcon(true);
	return user;
};

export const logoutUser = async () => {
	const token = await getAccessToken();
	if (!token) {
		return;
	}

	const res = await fetch(`${gkApiUrl}/user/logout`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!res.ok) {
		return;
	}

	// Attempt to remove the access token cookie from GitKraken.dev
	await cookies.remove({
		url: accessTokenCookieUrl,
		name: accessTokenCookieName,
	});

	await storage.session.clear();
	await updateExtensionIcon(false);
};

export const fetchProviderConnections = async () => {
	const token = await getAccessToken();
	if (!token) {
		return null;
	}

	return sessionCachedFetch('providerConnections', DefaultCacheTimeMinutes, async () => {
		const res = await fetch(`${gkApiUrl}/v1/provider-tokens/`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!res.ok) {
			return null;
		}

		const payload = await res.json();
		return payload.data as ProviderConnection[];
	});
};

export const fetchProviderToken = async (provider: Provider) => {
	const token = await getAccessToken();
	if (!token) {
		return null;
	}

	const res = await fetch(`${gkApiUrl}/v1/provider-tokens/${provider}`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!res.ok) {
		return null;
	}

	const payload = await res.json();
	return payload.data as ProviderToken;
};

export const fetchDraftCounts = async (prUniqueIds: string[]) => {
	const token = await getAccessToken();
	if (!token) {
		return null;
	}

	const res = await fetch(`${gkApiUrl}/v1/drafts/counts?type=suggested_pr_change`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'POST',
		body: JSON.stringify({ prEntityIds: prUniqueIds }),
	});

	const payload = await res.json();
	return payload.data as { counts: PullRequestDraftCounts };
};
