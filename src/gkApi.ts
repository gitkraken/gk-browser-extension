import { cookies } from 'webextension-polyfill';
import { updateExtensionIcon } from './shared';
import type { User } from './types';

const gkApiUrl = 'https://api.gitkraken.dev';
const gkDotDevUrl = 'https://gitkraken.dev';
const accessTokenCookieName = 'accessToken';

const getAccessToken = async () => {
  // Attempt to get the access token cookie from GitKraken.dev
  const cookie = await cookies.get({
    url: gkDotDevUrl,
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
      Authorization: `Bearer ${token}`
    }
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
		url: gkDotDevUrl,
		name: accessTokenCookieName,
	});

	await updateExtensionIcon(false);
};
