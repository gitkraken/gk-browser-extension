import { cookies } from 'webextension-polyfill';
import { checkOrigins } from './permissions-helper';
import { updateExtensionIcon } from './shared';
import type { ProviderConnection, User } from './types';

declare const MODE: 'production' | 'development' | 'none';

const gkApiUrl = MODE === 'production' ? 'https://api.gitkraken.dev' : 'https://dev-api.gitkraken.dev';
const accessTokenCookieUrl = 'https://gitkraken.dev';
const accessTokenCookieName = MODE === 'production' ? 'accessToken' : 'devAccessToken';

const getAccessToken = async () => {
	// Check if the user has granted permission to GitKraken.dev
	if (!await checkOrigins(['gitkraken.dev'])) {
		// If not, just assume we're logged out
		return undefined;
	}

	// Attempt to get the access token cookie from GitKraken.dev
	const cookie = await cookies.get({
		url: accessTokenCookieUrl,
		name: accessTokenCookieName,
	});

	return cookie?.value;
};

export const fetchUser = async () => {
	const token = await getAccessToken();
	if (!token) {
		return null;
	}

	const res = await fetch(`${gkApiUrl}/user`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!res.ok) {
		return null;
	}

	void updateExtensionIcon(true);

	const user = await res.json();
	return user as User;
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

	await updateExtensionIcon(false);
};

export const getProviderConnections = async (): Promise<ProviderConnection[] | null> => {
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
