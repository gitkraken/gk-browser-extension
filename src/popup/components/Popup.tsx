import React, { useEffect, useState } from 'react';
import { runtime } from 'webextension-polyfill';
import { fetchUser } from '../../gkApi';
import type { PermissionsRequest } from '../../permissions-helper';
import { PopupInitMessage } from '../../shared';
import type { User } from '../../types';
import { RequestPermissionsBanner } from './RequestPermissionsBanner';
import { SignedInMenuItems } from './SignedInMenuItems';
import { SignedOutMenuItems } from './SignedOutMenuItems';
import { SupportMenuItem } from './SupportMenuItem';

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
		return <i className="fa-regular fa-spinner-third fa-spin" />;
	}

	return (
		<div className={`menu ${user ? 'signed-in' : 'signed-out'}`}>
			{permissionsRequest && <RequestPermissionsBanner permissionsRequest={permissionsRequest} />}
			{permissionsRequest?.hasRequired ? (
				<SupportMenuItem />
			) : user ? (
				<SignedInMenuItems user={user} />
			) : (
				<SignedOutMenuItems />
			)}
		</div>
	);
};
