import { cookies } from 'webextension-polyfill';
import { updateExtensionIcon } from './shared';
import type { User } from './types';

declare const MODE: 'production' | 'development' | 'none';

const gkApiUrl = MODE === 'production' ? 'https://api.gitkraken.dev' : 'https://dev-api.gitkraken.dev';
const accessTokenCookieUrl = 'https://gitkraken.dev';
const accessTokenCookieName = MODE === 'production' ? 'accessToken' : 'devAccessToken';

const getAccessToken = async () => {
	try {
	// Attempt to get the access token cookie from GitKraken.dev
	const cookie = await cookies.get({
		url: accessTokenCookieUrl,
		name: accessTokenCookieName,
	});

		return cookie?.value;
	} catch (e) {
		if ((e as Error)?.message.includes('No host permissions for cookies at url')) {
			// ignore as we are waiting for required permissions
		} else {
			// otherwise log error and continue as if logged out
			console.error(e);
		}
	}
	return undefined;
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
