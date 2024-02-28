// Note: This code runs every time the extension popup is opened.

import { permissions, runtime } from 'webextension-polyfill';
import { createAnchor, createFAIcon } from './domUtils';
import { fetchUser, logoutUser } from './gkApi';
import type { PermissionsRequest } from './permissions-helper';
import { PopupInitMessage } from './shared';
import type { User } from './types';

declare const MODE: 'production' | 'development' | 'none';

const gkDotDevUrl = MODE === 'production' ? 'https://gitkraken.dev' : 'https://dev.gitkraken.dev';
const gkAccountSiteUrl = MODE === 'production' ? 'https://app.gitkraken.com' : 'https://devapp.gitkraken.com';

// Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#basic_example
const sha256 = async (text: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(text);
	const hash = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hash));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

const createPromoBanner = (promoMessage: string, callToAction: { text: string; url: string }) => {
	const promoEl = document.createElement('div');
	promoEl.classList.add('promo');

	promoEl.append(createFAIcon('fa-sparkles'));

	const contentEl = document.createElement('div');

	const messageEl = document.createElement('span');
	messageEl.textContent = promoMessage;
	contentEl.append(messageEl);

	const actionsEl = document.createElement('div');
	actionsEl.classList.add('actions');

	const ctaBtn = createAnchor(callToAction.url, '_blank');
	ctaBtn.textContent = callToAction.text;
	ctaBtn.classList.add('btn');
	actionsEl.append(ctaBtn);

	contentEl.append(actionsEl);

	promoEl.append(contentEl);

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
	userEl.append(gravatarEl);

	const userInfoEl = document.createElement('div');
	userInfoEl.classList.add('user-info');

	const userNameEl = document.createElement('div');
	userNameEl.textContent = user.name || user.username;
	userNameEl.classList.add('user-name', 'truncate');
	userInfoEl.append(userNameEl);

	const userEmailEl = document.createElement('div');
	userEmailEl.textContent = user.email;
	userEmailEl.classList.add('user-email', 'truncate');
	userInfoEl.append(userEmailEl);

	userEl.append(userInfoEl);

	const siteLink = createAnchor(gkDotDevUrl, '_blank');
	siteLink.append(createFAIcon('fa-arrow-up-right-from-square'));
	userEl.append(siteLink);

	mainEl.append(userEl);

	/* Sign out button */
	const signOutBtn = document.createElement('button');
	signOutBtn.append(createFAIcon('fa-right-from-bracket'), 'Sign out');
	signOutBtn.classList.add('menu-row');
	signOutBtn.addEventListener('click', async () => {
		await logoutUser();
		window.close();
	});
	mainEl.append(signOutBtn);

	const trialDaysLeft = getUserTrialDaysLeft(user);
	if (trialDaysLeft > 0) {
		const upgradePromo = createPromoBanner(`You have ${trialDaysLeft} days left in your free trial`, {
			text: 'Upgrade now',
			url: `${gkAccountSiteUrl}/create-organization`,
		});
		mainEl.append(upgradePromo);
	}
};

const renderLoggedOutContent = () => {
	const mainEl = document.getElementById('main-content')!;

	const signInLink = createAnchor(`${gkDotDevUrl}/login`, '_blank');
	signInLink.append(createFAIcon('fa-right-from-bracket'), 'Sign in to your GitKraken account');
	signInLink.classList.add('menu-row');
	mainEl.append(signInLink);

	const supportLink = createAnchor(
		'https://help.gitkraken.com/browser-extension/gitkraken-browser-extension',
		'_blank',
	);
	supportLink.append(createFAIcon('fa-question-circle'), 'Support');
	supportLink.classList.add('menu-row');
	mainEl.append(supportLink);

	const signUpPromo = createPromoBanner(`Get access to the world's most powerful suite of Git tools`, {
		text: 'Sign up for free',
		url: `${gkDotDevUrl}/register`,
	});

	mainEl.append(signUpPromo);
};

const syncWithBackground = async () => {
	return await runtime.sendMessage(PopupInitMessage) as PermissionsRequest | undefined;
};

function reloadPopup() {
	// This seems to work on Firefox and Chromium but I couldn't find any docs confirming this is the correct way
	window.location.reload();
}

const renderPermissionRequest = (permissionsRequest: PermissionsRequest) => {
	const mainEl = document.getElementById('main-content')!;

	const permissionRequestLink = createAnchor('#', undefined, async () => {
		await permissions.request(permissionsRequest.request);
		reloadPopup();
	});
	permissionRequestLink.classList.add('alert');
	if (permissionsRequest.hasRequired) {
		permissionRequestLink.append(createFAIcon('fa-triangle-exclamation'), 'Allow required permissions to continue');
		mainEl.append(permissionRequestLink);

		const supportLink = createAnchor(
			'https://help.gitkraken.com/browser-extension/gitkraken-browser-extension',
			'_blank',
		);
		supportLink.append(createFAIcon('fa-question-circle'), 'Support');
		supportLink.classList.add('menu-row');
		mainEl.append(supportLink);
	} else {
		permissionRequestLink.append(createFAIcon('fa-exclamation'), `Allow permissions for cloud git providers`);
		mainEl.append(permissionRequestLink);
	}
};

const finishLoading = () => {
	const loadingIcon = document.getElementById('loading-icon');
	loadingIcon?.remove();
};

async function main() {
	const permissionsRequest = await syncWithBackground();
	if (permissionsRequest) {
		renderPermissionRequest(permissionsRequest);
		if (permissionsRequest.hasRequired) {
			// Only required permissions blocks the UI
			finishLoading();
			return;
		}
	}

	const user = await fetchUser();
	if (user) {
		void renderLoggedInContent(user);
	} else {
		renderLoggedOutContent();
	}

	finishLoading();
};

void main();
