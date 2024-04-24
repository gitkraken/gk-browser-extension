import React from 'react';
import { GKDotDevUrl } from '../../shared';

export const ConnectAProvider = () => {
	return (
		<div className="connect-provider-container">
			<div className="connect-provider-prompt text-center">
				<div className="text-2xl bold">Connect an integration to see all of your pull requests</div>
				<a className="provider-buttons" href={`${GKDotDevUrl}/settings/integrations`} target="_blank">
					<div className="provider-button text-sm text-secondary">
						<img src="img/github-color.svg" height={24} />
						<div>GitHub</div>
					</div>
					<div className="provider-button text-sm text-secondary">
						<img src="img/gitlab-color.svg" height={24} />
						<div>GitLab</div>
					</div>
					<div className="provider-button text-sm text-secondary">
						<img src="img/bitbucket-color.svg" height={24} />
						<div>Bitbucket</div>
					</div>
					<div className="provider-button text-sm text-secondary">
						<img src="img/azuredevops-color.svg" height={24} />
						<div>Azure DevOps</div>
					</div>
				</a>
				<div className="text-sm text-secondary italic">
					*Only cloud-hosted providers are currently supported.
				</div>
			</div>
		</div>
	);
};
