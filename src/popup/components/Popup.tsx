import React, { useEffect, useState } from 'react';
import { runtime } from 'webextension-polyfill';
import { getAccessToken } from '../../gkApi';
import type { PermissionsRequest } from '../../permissions-helper';
import { PopupInitMessage } from '../../shared';
import { useUserQuery } from '../hooks';
import { RequestPermissionsBanner } from './RequestPermissionsBanner';
import { SignedIn } from './SignedIn';
import { SignedOut } from './SignedOut';

const syncWithBackground = async () => {
	return (await runtime.sendMessage(PopupInitMessage)) as PermissionsRequest | undefined;
};

export const Popup = () => {
	const [permissionsRequest, setPermissionsRequest] = useState<PermissionsRequest | undefined>(undefined);
	const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
	const [token, setToken] = useState<string | undefined>(undefined);

	const userQuery = useUserQuery(token);

	useEffect(() => {
		const checkPermissions = async () => {
			const newPermissionsRequest = await syncWithBackground();
			setPermissionsRequest(newPermissionsRequest);
			setIsCheckingPermissions(false);

			if (!newPermissionsRequest?.hasRequired) {
				const accessToken = await getAccessToken();
				setToken(accessToken);
			}
		};

		void checkPermissions();
	}, []);

	if (isCheckingPermissions || (!permissionsRequest?.hasRequired && userQuery.isLoading)) {
		return (
			<div className="popup-content small text-center">
				<i className="fa-regular fa-spinner-third fa-spin" />
			</div>
		);
	}

	if (permissionsRequest && permissionsRequest.hasRequired) {
		return (
			<div className="popup-content small">
				<RequestPermissionsBanner permissionsRequest={permissionsRequest} />
			</div>
		);
	}

	if (userQuery.data) {
		return <SignedIn permissionsRequest={permissionsRequest} user={userQuery.data} />;
	}

	return <SignedOut permissionsRequest={permissionsRequest} />;
};
