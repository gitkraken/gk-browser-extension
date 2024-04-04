import React, { useEffect, useState } from 'react';
import { runtime } from 'webextension-polyfill';
import { fetchUser } from '../../gkApi';
import type { PermissionsRequest } from '../../permissions-helper';
import { PopupInitMessage } from '../../shared';
import type { User } from '../../types';
import { RequestPermissionsMenuItem } from './RequestPermissionsMenuItem';
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
			const permissionsRequest = await syncWithBackground();
			setPermissionsRequest(permissionsRequest);

			if (!permissionsRequest?.hasRequired) {
				const user = await fetchUser();
				setUser(user);
			}

			setIsLoading(false);
		};

		void loadData();
	}, []);

	if (isLoading) {
		return <i id="loading-icon" className="fa-regular fa-spinner-third fa-spin" />;
	}

	return (
		<div className="menu">
			{permissionsRequest && <RequestPermissionsMenuItem permissionsRequest={permissionsRequest} />}
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
