import React, { useEffect, useState } from 'react';
import { runtime } from 'webextension-polyfill';
import { fetchUser } from '../../gkApi';
import type { PermissionsRequest } from '../../permissions-helper';
import { PopupInitMessage } from '../../shared';
import type { User } from '../../types';
import { RequestPermissionsBanner } from './RequestPermissionsBanner';
import { SignedIn } from './SignedIn';
import { SignedOut } from './SignedOut';

const syncWithBackground = async () => {
	return (await runtime.sendMessage(PopupInitMessage)) as PermissionsRequest | undefined;
};

export const Popup = () => {
	const [permissionsRequest, setPermissionsRequest] = useState<PermissionsRequest | undefined>(undefined);
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			const newPermissionsRequest = await syncWithBackground();
			setPermissionsRequest(newPermissionsRequest);

			if (!permissionsRequest?.hasRequired) {
				const fetchedUser = await fetchUser();
				setUser(fetchedUser);
			}

			setIsLoading(false);
		};

		void loadData();
	}, []);

	if (isLoading) {
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

	if (user) {
		return <SignedIn permissionsRequest={permissionsRequest} user={user} />;
	}

	return <SignedOut permissionsRequest={permissionsRequest} />;
};
