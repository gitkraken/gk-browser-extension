import { AzureDevOps, Bitbucket, GitHub, GitLab } from '@gitkraken/provider-apis';
import { fetchProviderToken } from './gkApi';
import type { FocusViewSupportedProvider, Provider } from './types';

export const ProviderMeta: Record<FocusViewSupportedProvider, { name: string; iconSrc: string }> = {
	github: { name: 'GitHub', iconSrc: 'img/github-color.svg' },
	gitlab: { name: 'GitLab', iconSrc: 'img/gitlab-color.svg' },
	bitbucket: { name: 'Bitbucket', iconSrc: 'img/bitbucket-color.svg' },
	azure: { name: 'Azure DevOps', iconSrc: 'img/azure-color.svg' },
};

const fetchGitHubFocusViewData = async (token: string) => {
	const github = new GitHub({ token: token });

	const { data: providerUser } = await github.getCurrentUser();
	if (!providerUser.username) {
		return null;
	}

	const { data: pullRequests } = await github.getPullRequestsAssociatedWithUser({
		username: providerUser.username,
	});

	return { providerUser: providerUser, pullRequests: pullRequests };
};

const fetchGitLabFocusViewData = async (token: string) => {
	const gitlab = new GitLab({ token: token });

	const { data: providerUser } = await gitlab.getCurrentUser();
	if (!providerUser.username) {
		return null;
	}

	const { data: pullRequests } = await gitlab.getPullRequestsAssociatedWithUser({
		username: providerUser.username,
	});

	return { providerUser: providerUser, pullRequests: pullRequests };
};

const fetchBitbucketFocusViewData = async (token: string) => {
	const bitbucket = new Bitbucket({ token: token });

	const { data: providerUser } = await bitbucket.getCurrentUser();

	const { data: pullRequests } = await bitbucket.getPullRequestsForUser({
		userId: providerUser.id,
	});

	return { providerUser: providerUser, pullRequests: pullRequests };
};

const fetchAzureFocusViewData = async (token: string) => {
	const azureDevOps = new AzureDevOps({ token: token });

	// Getting a user's PRs requires getting their projects, which requires getting their organizations
	const { data: providerUser } = await azureDevOps.getCurrentUser();

	const { data: providerOrgs } = await azureDevOps.getOrgsForUser({ userId: providerUser.id });

	const projectsResponses = await Promise.all(
		providerOrgs.map(org => azureDevOps.getAzureProjects({ namespace: org.name })),
	);
	const projects = projectsResponses.flatMap(response => response.data);

	const { data: pullRequests } = await azureDevOps.getPullRequestsForProjects({
		projects: projects.map(project => ({ ...project, project: project.name })),
	});

	return { providerUser: providerUser, pullRequests: pullRequests };
};

export const fetchFocusViewData = async (provider: FocusViewSupportedProvider) => {
	const providerToken = await fetchProviderToken(provider);
	if (!providerToken) {
		return null;
	}

	switch (provider) {
		case 'github':
			return fetchGitHubFocusViewData(providerToken.accessToken);
		case 'gitlab':
			return fetchGitLabFocusViewData(providerToken.accessToken);
		case 'bitbucket':
			return fetchBitbucketFocusViewData(providerToken.accessToken);
		case 'azure':
			return fetchAzureFocusViewData(providerToken.accessToken);
		default:
			throw new Error(`Attempted to fetch pull requests for unsupported provider: ${provider as Provider}`);
	}
};
