import { action, cookies } from 'webextension-polyfill';
import type { User } from './types';

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

export const updateExtensionIcon = (isLoggedIn: boolean) => action.setIcon({ path: isLoggedIn ? IconPaths.Green : IconPaths.Grey });

export const getAccessToken = async () => {
  // Attempt to get the access token cookie from GitKraken.dev
  const cookie = await cookies.get({
    url: 'https://gitkraken.dev',
    name: 'accessToken'
  });

  return cookie?.value;
};

export const fetchUser = async () => {
  const token = await getAccessToken();
  if (!token) {
    // The user is not logged in.
    return;
  }

  const res = await fetch('https://api.gitkraken.dev/user', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    // The access token is invalid or expired.
    return;
  }

  const user = await res.json();
  return user as User;
};
