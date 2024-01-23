// Note: This code runs every time the extension popup is opened.

import { cookies } from 'webextension-polyfill';
import { fetchUser, getAccessToken, updateExtensionIcon } from './shared';
import type { User } from './types';

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

const getUserTrialDaysLeft = (user: User) => {
  const trialEnd = user.proAccessState?.trial?.end;
  if (!trialEnd) {
    return 0;
  }

  const trialEndDate = new Date(trialEnd);
  const now = new Date();
  const diff = trialEndDate.getTime() - now.getTime();
  if (diff < 0) {
    return 0;
  }

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

  await updateExtensionIcon(false);
};

const makeIcon = (faIcon: string) => {
  const icon = document.createElement('i');
  icon.classList.add('fa-regular', faIcon, 'icon');
  return icon;
};

const makePromoBanner = (promoMessage: string, callToAction: { text: string; url: string }) => {
  const promoEl = document.createElement('div');
  promoEl.classList.add('promo');
  const sparklesIcon = makeIcon('fa-sparkles');
  promoEl.appendChild(sparklesIcon);

  const contentEl = document.createElement('div');
  const messageEl = document.createElement('span');
  messageEl.textContent = promoMessage;
  contentEl.appendChild(messageEl);

  const actionsEl = document.createElement('div');
  actionsEl.classList.add('actions');

  const ctaBtn = document.createElement('a');
  ctaBtn.textContent = callToAction.text;
  ctaBtn.href = callToAction.url;
  ctaBtn.target = '_blank';
  ctaBtn.classList.add('btn');
  actionsEl.appendChild(ctaBtn);

  contentEl.appendChild(actionsEl);

  promoEl.appendChild(contentEl);

  return promoEl;
};

const renderLoggedInContent = async (user: User) => {
  const emailHash = await sha256(user.email);

  const mainEl = document.getElementById('main-content')!;

  /* User Info element */
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

  const siteLink = document.createElement('a');
  siteLink.href = 'https://gitkraken.dev';
  siteLink.target = '_blank';
  const siteIcon = makeIcon('fa-arrow-up-right-from-square');
  siteLink.appendChild(siteIcon);
  userEl.appendChild(siteLink);

  mainEl.appendChild(userEl);

  /* Sign out button */
  const signOutBtn = document.createElement('button');
  signOutBtn.textContent = 'Sign out';
  signOutBtn.classList.add('menu-row-btn');
  signOutBtn.addEventListener('click', async () => {
    await logout();
    window.close();
  });

  const signOutIcon = makeIcon('fa-right-from-bracket');
  signOutBtn.prepend(signOutIcon);

  mainEl.appendChild(signOutBtn);

  const trialDaysLeft = getUserTrialDaysLeft(user);
  if (trialDaysLeft > 0) {
    const upgradePromo = makePromoBanner(
      `You have ${trialDaysLeft} days left in your free trial`,
      {
        text: 'Upgrade now',
        url: 'https://app.gitkraken.com/create-organization'
      }
    );
    mainEl.appendChild(upgradePromo);
  }
};

const renderLoggedOutContent = () => {
  const mainEl = document.getElementById('main-content')!;

  const signInLink = document.createElement('a');
  signInLink.href = 'https://gitkraken.dev/login';
  signInLink.textContent = 'Sign in to your GitKraken account';
  signInLink.target = '_blank';
  signInLink.classList.add('menu-row-btn');

  const signInIcon = makeIcon('fa-right-from-bracket');
  signInLink.prepend(signInIcon);

  mainEl.appendChild(signInLink);

  const supportLink = document.createElement('a');
  supportLink.href = 'https://help.gitkraken.com/browser-extension/gitkraken-browser-extension';
  supportLink.textContent = 'Support';
  supportLink.target = '_blank';
  supportLink.classList.add('menu-row-btn');

  const supportIcon = makeIcon('fa-question-circle');
  supportLink.prepend(supportIcon);

  mainEl.appendChild(supportLink);

  const signUpPromo = makePromoBanner(
    `Get access to the world's most powerful suite of Git tools`,
    {
      text: 'Sign up for free',
      url: 'https://gitkraken.dev/register'
    }
  );

  mainEl.appendChild(signUpPromo);
};

const main = async () => {
  const user = await fetchUser();
  if (user) {
    void renderLoggedInContent(user);
    void updateExtensionIcon(true);
  } else {
    renderLoggedOutContent();
    void updateExtensionIcon(false);
  }

  const loadingIcon = document.getElementById('loading-icon');
  loadingIcon?.remove();
};

void main();
