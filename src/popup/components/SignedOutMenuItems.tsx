import React from 'react';
import { GKDotDevUrl } from '../../shared';
import { Promo } from './Promo';
import { SupportMenuItem } from './SupportMenuItem';

export const SignedOutMenuItems = () => {
	return (
		<>
			<a className="menu-row" href={`${GKDotDevUrl}/login`} target="_blank">
				<i className="fa-regular fa-right-from-bracket icon" />
				Sign in to your GitKraken account
			</a>
			<SupportMenuItem />
			<Promo
				message="Get access to the world's most powerful suite of Git tools"
				callToActionLabel="Sign up for free"
				callToActionUrl={`${GKDotDevUrl}/register`}
			/>
		</>
	);
};
