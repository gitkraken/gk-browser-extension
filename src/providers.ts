import { GitHub, GitLab } from '@gitkraken/provider-apis';
import { fetchProviderToken } from './gkApi';
import type { FocusViewSupportedProvider, Provider } from './types';

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
		default:
			throw new Error(`Attempted to fetch pull requests for unsupported provider: ${provider as Provider}`);
	}
};
