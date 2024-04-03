import React from 'react';
import { GKDotDevUrl } from '../shared';
import { Promo } from './Promo';

export const SignedOut = () => {
	return (
		<div className="menu">
			<a className="menu-row" href={`${GKDotDevUrl}/login`} target="_blank">
				<i className="fa-regular fa-right-from-bracket icon" />
				Sign in to your GitKraken account
			</a>
			<a
				className="menu-row"
				href="https://help.gitkraken.com/browser-extension/gitkraken-browser-extension"
				target="_blank"
			>
				<i className="fa-regular fa-question-circle icon" />
				Support
			</a>
			<Promo
				message="Get access to the world's most powerful suite of Git tools"
				callToActionLabel="Sign up for free"
				callToActionUrl={`${GKDotDevUrl}/register`}
			/>
		</div>
	);
};
