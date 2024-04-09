import React, { useEffect, useState } from 'react';
import { logoutUser } from '../../gkApi';
import { GKAccountSiteUrl, GKDotDevUrl } from '../../shared';
import type { User } from '../../types';
import { FocusView } from './FocusView';
import { Promo } from './Promo';
import { SupportMenuItem } from './SupportMenuItem';

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

export const SignedInMenuItems = ({ user }: { user: User }) => {
	const [emailHash, setEmailHash] = useState<string | null>(null);
	useEffect(() => {
		void sha256(user.email).then(setEmailHash);
	}, [user.email]);

	const onSignOutClick = async () => {
		await logoutUser();
		window.close();
	};

	const trialDaysLeft = getUserTrialDaysLeft(user);

	return (
		<>
			<FocusView />
			<div className="user">
				<img
					className="avatar"
					src={`https://www.gravatar.com/avatar/${emailHash}?s=30&d=retro`}
					alt={user.name || user.email}
					title={user.name || user.email}
				/>
				<div className="user-info">
					<div className="user-name truncate">{user.name || user.username}</div>
					<div className="user-email truncate">{user.email}</div>
				</div>
				<a href={GKDotDevUrl} target="_blank">
					<i className="fa-regular fa-arrow-up-right-from-square icon" />
				</a>
			</div>
			<SupportMenuItem />
			<button className="menu-row" onClick={onSignOutClick}>
				<i className="fa-regular fa-right-from-bracket icon" />
				Sign Out
			</button>
			{trialDaysLeft > 0 && (
				<Promo
					message={`You have ${trialDaysLeft} days left in your free trial`}
					callToActionLabel="Upgrade now"
					callToActionUrl={`${GKAccountSiteUrl}/create-organization`}
				/>
			)}
		</>
	);
};
