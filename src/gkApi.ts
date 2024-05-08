import { cookies, storage } from 'webextension-polyfill';
import { checkOrigins } from './permissions-helper';
import { updateExtensionIcon } from './shared';
import type { Provider, ProviderConnection, ProviderToken, PullRequestDraftCounts, User } from './types';

declare const MODE: 'production' | 'development' | 'none';

const gkApiUrl = MODE === 'production' ? 'https://api.gitkraken.dev' : 'https://dev-api.gitkraken.dev';
const accessTokenCookieUrl = 'https://gitkraken.dev';
const accessTokenCookieName = MODE === 'production' ? 'accessToken' : 'devAccessToken';

const onLoggedOut = () => {
	void updateExtensionIcon(false);
	void storage.session.clear();
};

export const getAccessToken = async () => {
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

export const checkin = async () => {
	const token = await getAccessToken();
	if (!token) {
		return;
	}

	// Don't check in more than once every 12 hours to reduce amount of requests
	const { lastCheckin } = await storage.local.get('lastCheckin');
	if (lastCheckin && Date.now() - lastCheckin < 1000 * 60 * 60) {
		return;
	}

	const res = await fetch(`${gkApiUrl}/browser-extension/checkin`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'POST',
	});

	if (res.ok) {
		void storage.local.set({ lastCheckin: Date.now() });
	}
};

export const fetchUser = async () => {
	const token = await getAccessToken();
	if (!token) {
		onLoggedOut();
		return null;
	}

	const res = await fetch(`${gkApiUrl}/user`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!res.ok) {
		onLoggedOut();
		return null;
	}

	const user = (await res.json()) as User;
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
};

export const refreshProviderToken = async (provider: Provider) => {
	const token = await getAccessToken();
	if (!token) {
		return null;
	}

	const res = await fetch(`${gkApiUrl}/v1/provider-tokens/${provider}/refresh`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'POST',
	});

	if (!res.ok) {
		return null;
	}

	const payload = await res.json();
	return payload.data as ProviderToken;
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
	const providerToken = payload.data as ProviderToken;
	// Attempt to refresh expired OAuth tokens. Note: GitHub tokens don't expire.
	// We also refresh tokens that are about to expire in 60 seconds (expiresIn is in seconds).
	if (provider !== 'github' && providerToken.expiresIn < 60 && providerToken.type === 'oauth') {
		return refreshProviderToken(provider);
	}

	return providerToken;
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

export const postEvent = async (event: string, data?: Record<string, unknown>) => {
	const token = await getAccessToken();
	if (!token) {
		return;
	}

	await fetch(`${gkApiUrl}/events`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'POST',
		body: JSON.stringify({
			source: 'browser_extension',
			event: event,
			data: data,
		}),
	});
};
