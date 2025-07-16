import {
	AzureDevOps,
	Bitbucket,
	BitbucketServer,
	EntityIdentifierProviderType,
	EntityIdentifierUtils,
	EntityType,
	GitHub,
	GitLab,
} from '@gitkraken/provider-apis';
import { fetchProviderToken } from './gkApi';
import { GKDotDevUrl } from './shared';
import type { FocusViewData, FocusViewSupportedProvider, Provider, ProviderToken } from './types';

export const ProviderMeta: Record<FocusViewSupportedProvider, { name: string; iconSrc: string }> = {
	github: { name: 'GitHub', iconSrc: 'img/github-color.svg' },
	githubEnterprise: { name: 'GitHub Enterprise Server', iconSrc: 'img/github-color.svg' },
	gitlab: { name: 'GitLab', iconSrc: 'img/gitlab-color.svg' },
	gitlabSelfHosted: { name: 'GitLab Self-Managed', iconSrc: 'img/gitlab-color.svg' },
	bitbucket: { name: 'Bitbucket', iconSrc: 'img/bitbucket-color.svg' },
	bitbucketServer: { name: 'Bitbucket Data Center', iconSrc: 'img/bitbucket-color.svg' },
	azure: { name: 'Azure DevOps', iconSrc: 'img/azuredevops-color.svg' },
};

const fetchGitHubFocusViewData = async (token: ProviderToken) => {
	const github = new GitHub({ token: token.accessToken, baseUrl: token.domain });

	const { data: providerUser } = await github.getCurrentUser();
	if (!providerUser.username) {
		return null;
	}

	const { data: pullRequests } = await github.getPullRequestsAssociatedWithUser({
		username: providerUser.username,
	});

	return {
		providerUser: providerUser,
		pullRequests: pullRequests.map(pr => ({
			...pr,
			uuid: EntityIdentifierUtils.encode({
				provider: token.domain
					? EntityIdentifierProviderType.GithubEnterprise
					: EntityIdentifierProviderType.Github,
				entityType: EntityType.PullRequest,
				domain: token.domain,
				entityId: pr.graphQLId || pr.id,
			}),
		})),
	};
};

const fetchGitLabFocusViewData = async (token: ProviderToken) => {
	const gitlab = new GitLab({ token: token.accessToken, baseUrl: token.domain });

	const { data: providerUser } = await gitlab.getCurrentUser();
	if (!providerUser.username) {
		return null;
	}

	const { data: pullRequests } = await gitlab.getPullRequestsAssociatedWithUser({
		username: providerUser.username,
	});

	return { providerUser: providerUser, pullRequests: pullRequests.map(pr => ({ ...pr, uuid: '' })) };
};

const fetchBitbucketFocusViewData = async (token: ProviderToken) => {
	const bitbucket = new Bitbucket({ token: token.accessToken });

	const { data: providerUser } = await bitbucket.getCurrentUser();

	const { data: pullRequests } = await bitbucket.getPullRequestsForUser({
		userId: providerUser.id,
	});

	return { providerUser: providerUser, pullRequests: pullRequests.map(pr => ({ ...pr, uuid: '' })) };
};

const fetchBitbucketServerFocusViewData = async (token: ProviderToken) => {
	const bitbucketServer = new BitbucketServer({
		token: token.accessToken,
		// Bitbucket Data Center does not have the CORS header set to be able to make requests from the browser,
		// so we proxy the request through the API.
		baseUrl: `${GKDotDevUrl}/api/provider/bitbucket-server/proxy/${encodeURIComponent(
			`${token.domain?.replace(/\/+$/, '')}/rest/api/latest`,
		)}`,
	});

	const { data: providerUser } = await bitbucketServer.getCurrentUser();

	const { data: pullRequests } = await bitbucketServer.getPullRequestsForCurrentUser({});

	return {
		providerUser: providerUser,
		pullRequests: (pullRequests || []).map(pr => ({
			...pr,
			uuid: '',
		})),
	};
};

const fetchAzureFocusViewData = async (token: ProviderToken) => {
	const azureDevOps = new AzureDevOps({ token: token.accessToken });

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

	return { providerUser: providerUser, pullRequests: pullRequests.map(pr => ({ ...pr, uuid: '' })) };
};

export const fetchFocusViewData = async (provider: FocusViewSupportedProvider): Promise<FocusViewData | null> => {
	const providerToken = await fetchProviderToken(provider);
	if (!providerToken) {
		return null;
	}

	try {
		switch (provider) {
			case 'github':
			case 'githubEnterprise':
				return await fetchGitHubFocusViewData(providerToken);
			case 'gitlab':
			case 'gitlabSelfHosted':
				return await fetchGitLabFocusViewData(providerToken);
			case 'bitbucket':
				return await fetchBitbucketFocusViewData(providerToken);
			case 'bitbucketServer':
				return await fetchBitbucketServerFocusViewData(providerToken);
			case 'azure':
				return await fetchAzureFocusViewData(providerToken);
			default:
				throw new Error(`Attempted to fetch pull requests for unsupported provider: ${provider as Provider}`);
		}
	} catch (e) {
		if (e) {
			Object.assign(e, { provider: provider, domain: providerToken.domain });
		}
		throw e;
	}
};
