// Note: This code runs every time the extension popup is opened.

import { cookies } from 'webextension-polyfill';

interface User {
  email: string;
  name?: string;
  username: string;
}

const fetchUser = async () => {
  // Attempt to get the access token cookie from GitKraken.dev
  const cookie = await cookies.get({
    url: 'https://gitkraken.dev',
    name: 'accessToken'
  });

  if (!cookie) {
    // The user is not logged in.
    return;
  }

  const res = await fetch('https://api.gitkraken.dev/user', {
    headers: {
      Authorization: `Bearer ${cookie.value}`
    }
  });

  if (!res.ok) {
    // The access token is invalid or expired.
    return;
  }

  const user = await res.json();
  return user as User;
};

const renderLoggedInContent = (user: User) => {
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
    renderLoggedInContent(user);
  } else {
    renderLoggedOutContent();
  }
};

void main();
