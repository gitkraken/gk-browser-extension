import React from 'react';
import { GKDotDevUrl } from '../../shared';

export const ConnectAProvider = () => {
	return (
		<div className="connect-provider-container">
			<div className="connect-provider-prompt text-center">
				<div className="text-2xl bold">Connect an integration to see all of your pull requests</div>
				<a className="text-link" href={`${GKDotDevUrl}/settings/integrations`} target="_blank">
					Integration Settings
				</a>
				<div className="text-sm text-secondary italic">
					*Only GitHub and GitLab are currently supported. More support currently in development.
				</div>
			</div>
		</div>
	);
};
