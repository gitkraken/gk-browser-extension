import React from 'react';
import { GKDotDevUrl } from '../../shared';
import { ExternalLink } from './ExternalLink';

export const ConnectAProvider = () => {
	return (
		<div className="connect-provider-container">
			<div className="connect-provider-prompt text-center">
				<div className="text-2xl bold">Connect an integration to see all of your pull requests</div>
				<div className="provider-buttons">
					<ExternalLink
						className="provider-button text-sm text-secondary"
						href={`${GKDotDevUrl}/settings/integrations?connect=github`}
					>
						<img src="img/github-color.svg" height={24} />
						<div>GitHub</div>
					</ExternalLink>
					<ExternalLink
						className="provider-button text-sm text-secondary"
						href={`${GKDotDevUrl}/settings/integrations?connect=gitlab`}
					>
						<img src="img/gitlab-color.svg" height={24} />
						<div>GitLab</div>
					</ExternalLink>
					<ExternalLink
						className="provider-button text-sm text-secondary"
						href={`${GKDotDevUrl}/settings/integrations?connect=bitbucket`}
					>
						<img src="img/bitbucket-color.svg" height={24} />
						<div>Bitbucket</div>
					</ExternalLink>
					<ExternalLink
						className="provider-button text-sm text-secondary"
						href={`${GKDotDevUrl}/settings/integrations?connect=azure`}
					>
						<img src="img/azuredevops-color.svg" height={24} />
						<div>Azure DevOps</div>
					</ExternalLink>
				</div>
			</div>
		</div>
	);
};
