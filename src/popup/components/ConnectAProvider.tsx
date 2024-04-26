import React from 'react';
import { GKDotDevUrl } from '../../shared';

export const ConnectAProvider = () => {
	return (
		<div className="connect-provider-container">
			<div className="connect-provider-prompt text-center">
				<div className="text-2xl bold">Connect an integration to see all of your pull requests</div>
				<div className="provider-buttons">
					<a
						className="provider-button text-sm text-secondary"
						href={`${GKDotDevUrl}/settings/integrations?connect=github`}
						target="_blank"
					>
						<img src="img/github-color.svg" height={24} />
						<div>GitHub</div>
					</a>
					<a
						className="provider-button text-sm text-secondary"
						href={`${GKDotDevUrl}/settings/integrations?connect=gitlab`}
						target="_blank"
					>
						<img src="img/gitlab-color.svg" height={24} />
						<div>GitLab</div>
					</a>
					<a
						className="provider-button text-sm text-secondary"
						href={`${GKDotDevUrl}/settings/integrations?connect=bitbucket`}
						target="_blank"
					>
						<img src="img/bitbucket-color.svg" height={24} />
						<div>Bitbucket</div>
					</a>
					<a
						className="provider-button text-sm text-secondary"
						href={`${GKDotDevUrl}/settings/integrations?connect=azure`}
						target="_blank"
					>
						<img src="img/azuredevops-color.svg" height={24} />
						<div>Azure DevOps</div>
					</a>
				</div>
				<div className="text-sm text-secondary italic">
					*Only cloud-hosted providers are currently supported.
				</div>
			</div>
		</div>
	);
};
