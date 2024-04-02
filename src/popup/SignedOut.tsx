import React from 'react';
import { GKDotDevUrl } from '../shared';

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
			<div className="promo">
				<i className="fa-regular fa-sparkles icon" />
				<div>
					<span>Get access to the world's most powerful suite of Git tools</span>
					<div className="actions">
						<a className="btn" href={`${GKDotDevUrl}/register`} target="_blank">
							Sign up for free
						</a>
					</div>
				</div>
			</div>
		</div>
	);
};
