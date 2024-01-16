// Note: This code runs every time the extension popup is opened.

import { cookies } from 'webextension-polyfill';

interface User {
  email: string;
  name?: string;
  username: string;
}

// Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#basic_example
const sha256 = async (text: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
};

const getAccessToken = async () => {
  // Attempt to get the access token cookie from GitKraken.dev
  const cookie = await cookies.get({
    url: 'https://gitkraken.dev',
    name: 'accessToken'
  });

  return cookie?.value;
};

const fetchUser = async () => {
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

const logout = async () => {
  const token = await getAccessToken();
  if (!token) {
    // The user is not logged in.
    return;
  }

  const res = await fetch('https://api.gitkraken.dev/user/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    // The access token is invalid or expired.
    return;
  }

  // Attempt to clean up the access token cookie from GitKraken.dev
  await cookies.remove({
    url: 'https://gitkraken.dev',
    name: 'accessToken'
  });
};

const renderLoggedInContent = async (user: User) => {
  const emailHash = await sha256(user.email);

  const mainEl = document.getElementById('main-content')!;

  const userEl = document.createElement('div');
  userEl.classList.add('user');

  const gravatarEl = document.createElement('img');
  gravatarEl.src = `https://www.gravatar.com/avatar/${emailHash}?s=30&d=retro`;
  gravatarEl.alt = user.name || user.username;
  gravatarEl.classList.add('avatar');
  userEl.appendChild(gravatarEl);

  const userInfoEl = document.createElement('div');
  userInfoEl.classList.add('user-info');

  const userNameEl = document.createElement('div');
  userNameEl.textContent = user.name || user.username;
  userNameEl.classList.add('user-name');
  userInfoEl.appendChild(userNameEl);

  const userEmailEl = document.createElement('div');
  userEmailEl.textContent = user.email;
  userEmailEl.classList.add('user-email');
  userInfoEl.appendChild(userEmailEl);

  userEl.appendChild(userInfoEl);

  mainEl.appendChild(userEl);

  const signOutBtn = document.createElement('button');
  signOutBtn.textContent = 'Sign out';
  signOutBtn.classList.add('btn');
  signOutBtn.addEventListener('click', async () => {
    await logout();
    window.close();
  });
  mainEl.appendChild(signOutBtn);
};

const renderLoggedOutContent = () => {
  const mainEl = document.getElementById('main-content')!;

  const signInLink = document.createElement('a');
  signInLink.href = 'https://gitkraken.dev/login';
  signInLink.target = '_blank';
  signInLink.textContent = 'Sign in GitKraken account';
  signInLink.classList.add('btn');

  mainEl.appendChild(signInLink);
};

const main = async () => {
  const user = await fetchUser();
  if (user) {
    void renderLoggedInContent(user);
  } else {
    renderLoggedOutContent();
  }
};

void main();