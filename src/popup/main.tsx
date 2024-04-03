// Note: This code runs every time the extension popup is opened.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { permissions, runtime } from 'webextension-polyfill';
import { fetchUser } from '../gkApi';
import type { PermissionsRequest } from '../permissions-helper';
import { PermissionsGrantedMessage, PopupInitMessage } from '../shared';
import { createAnchor, createFAIcon } from './domUtils';
import { Popup } from './Popup';

const syncWithBackground = async () => {
	return (await runtime.sendMessage(PopupInitMessage)) as PermissionsRequest | undefined;
};

const sendPermissionsGranted = async () => {
	await runtime.sendMessage(PermissionsGrantedMessage);
};

const renderPermissionRequest = (permissionsRequest: PermissionsRequest) => {
	const mainEl = document.getElementById('popup-container')!;

	const permissionRequestLink = createAnchor('#', undefined, async () => {
		const granted = await permissions.request(permissionsRequest.request);
		if (granted) {
			await sendPermissionsGranted();
		}
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
		const typesRequested: string[] = [];
		if (permissionsRequest.hasCloud) {
			typesRequested.push('cloud');
		}
		if (permissionsRequest.hasEnterprise) {
			typesRequested.push('self-hosted');
		}

		permissionRequestLink.append(
			createFAIcon('fa-triangle-exclamation'),
			`Allow permissions for ${typesRequested.join(' & ')} git providers`,
		);
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
	const mainEl = document.getElementById('popup-container')!;
	const root = createRoot(mainEl);
	root.render(<Popup user={user} />);
}

void main();
