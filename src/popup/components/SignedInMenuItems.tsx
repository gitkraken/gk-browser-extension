import React, { useEffect, useState } from 'react';
import { logoutUser } from '../../gkApi';
import { GKDotDevUrl } from '../../shared';
import type { User } from '../../types';
import { FocusView } from './FocusView';

// Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#basic_example
const sha256 = async (text: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(text);
	const hash = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hash));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	return hashHex;
};

export const SignedInMenuItems = ({ user }: { user: User }) => {
	const [emailHash, setEmailHash] = useState<string | null>(null);
	useEffect(() => {
		void sha256(user.email).then(setEmailHash);
	}, [user.email]);

	const onSignOutClick = async () => {
		await logoutUser();
		window.close();
	};

	return (
		<>
			<FocusView />
			<div className="user-row">
				<div className="user">
					<img
						className="avatar"
						src={`https://www.gravatar.com/avatar/${emailHash}?s=36&d=retro`}
						alt={user.name || user.email}
						title={user.name || user.email}
					/>
					<div>
						<div className="user-name">{user.name || user.username}</div>
						<div className="user-email">{user.email}</div>
					</div>
					<a href={GKDotDevUrl} target="_blank">
						<i className="fa-regular fa-arrow-up-right-from-square icon" />
					</a>
				</div>
				<button className="icon-btn" onClick={onSignOutClick}>
					<i className="fa-regular fa-right-from-bracket icon" />
				</button>
			</div>
		</>
	);
};
