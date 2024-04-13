import React, { useEffect, useState } from 'react';
import { logoutUser } from '../../gkApi';
import type { PermissionsRequest } from '../../permissions-helper';
import { GKDotDevUrl } from '../../shared';
import type { User } from '../../types';
import { FocusView } from './FocusView';
import { RequestPermissionsBanner } from './RequestPermissionsBanner';

// Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#basic_example
const sha256 = async (text: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(text);
	const hash = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hash));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	return hashHex;
};

export const SignedIn = ({ permissionsRequest, user }: { permissionsRequest?: PermissionsRequest; user: User }) => {
	const [emailHash, setEmailHash] = useState<string | null>(null);
	useEffect(() => {
		void sha256(user.email).then(setEmailHash);
	}, [user.email]);

	const onSignOutClick = async () => {
		await logoutUser();
		window.close();
	};

	return (
		<div className="popup-content signed-in">
			{permissionsRequest && <RequestPermissionsBanner permissionsRequest={permissionsRequest} />}
			<div className="main-ui">
				<FocusView />
			</div>
			<div className="user-row">
				<div className="user">
					<img
						className="avatar"
						src={`https://www.gravatar.com/avatar/${emailHash}?s=36&d=retro`}
						alt={user.name || user.email}
						title={user.name || user.email}
					/>
					<div>
						<div>{user.name || user.username}</div>
						<div className="text-sm text-secondary">{user.email}</div>
					</div>
					<a href={GKDotDevUrl} target="_blank">
						<i className="fa-regular fa-arrow-up-right-from-square icon text-lg" />
					</a>
				</div>
				<button className="icon-btn" onClick={onSignOutClick}>
					<i className="fa-regular fa-right-from-bracket icon text-lg" />
				</button>
			</div>
		</div>
	);
};
