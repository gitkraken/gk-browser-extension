import React from 'react';
import type { PermissionsRequest } from '../../permissions-helper';
import { GKDotDevUrl } from '../../shared';
import { RequestPermissionsBanner } from './RequestPermissionsBanner';

export const SignedOut = ({ permissionsRequest }: { permissionsRequest?: PermissionsRequest }) => {
	return (
		<div className="popup-content signed-out">
			{permissionsRequest && <RequestPermissionsBanner permissionsRequest={permissionsRequest} />}
			<div className="sign-in-prompt">
				<div className="text-2xl bold">Sign in to view your Pull Requests</div>
				<a className="sign-in-link text-sm text-secondary bg-02" href={`${GKDotDevUrl}/login`} target="_blank">
					<img src="img/gk-logo-36.svg" height={36} width={36} />
					Sign in with GitKraken
				</a>
				<a className="text-link" href={`${GKDotDevUrl}/register`} target="_blank">
					Create an account
				</a>
			</div>
		</div>
	);
};
