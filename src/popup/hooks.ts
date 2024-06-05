import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchDraftCounts, fetchProviderConnections, fetchUser } from '../gkApi';
import { fetchFocusViewData } from '../providers';
import type { FocusViewSupportedProvider } from '../types';

export const useUserQuery = (token: string | undefined) => {
	return useQuery({
		enabled: Boolean(token),
		queryKey: [token, 'user'],
		queryFn: fetchUser,
		// User info is rarely updated, so we can cache it for a long time
		staleTime: 1000 * 60 * 60 * 24, // 24 hours
	});
};

export const useProviderConnectionsQuery = (userId: string) => {
	return useQuery({
		queryKey: [userId, 'providerConnections'],
		queryFn: fetchProviderConnections,
	});
};

export const useFocusViewConnectedProviders = (userId: string) => {
	const providerConnectionsQuery = useProviderConnectionsQuery(userId);

	return useMemo(() => {
		if (!providerConnectionsQuery.data) {
			return null;
		}

		return providerConnectionsQuery.data
			.filter(
				connection =>
					connection.provider === 'github' ||
					connection.provider === 'githubEnterprise' ||
					connection.provider === 'gitlab' ||
					connection.provider === 'gitlabSelfHosted' ||
					connection.provider === 'bitbucket' ||
					connection.provider === 'bitbucketServer' ||
					connection.provider === 'azure',
			)
			.map(connection => connection.provider as FocusViewSupportedProvider);
	}, [providerConnectionsQuery.data]);
};

export const useFocusViewDataQuery = (
	userId: string,
	selectedProvider: FocusViewSupportedProvider | null | undefined,
) => {
	return useQuery({
		enabled: Boolean(selectedProvider),
		queryKey: [userId, 'focusViewData', selectedProvider],
		queryFn: async () => {
			if (!selectedProvider) {
				return null;
			}

			return fetchFocusViewData(selectedProvider);
		},
		// Focus view data is expensive, so we increase the stale time, and manually
		// mark the data as stale if the user clicks on a PR link, which indicates
		// that the user intends to take an action on the PR.
		staleTime: 1000 * 60 * 10, // 10 minutes
	});
};

export const usePullRequestDraftCountsQuery = (
	userId: string,
	selectedProvider: FocusViewSupportedProvider | null | undefined,
	pullRequests: { uuid: string }[] | undefined,
) => {
	let prUniqueIds: string[] = [];
	if (selectedProvider === 'github' && pullRequests?.length) {
		prUniqueIds = pullRequests.map(pr => pr.uuid);
	}

	return useQuery({
		enabled: selectedProvider === 'github' && prUniqueIds.length > 0,
		queryKey: [userId, 'focusViewData', selectedProvider, 'draftCounts', prUniqueIds],
		queryFn: async () => {
			const draftCounts = await fetchDraftCounts(prUniqueIds);
			return draftCounts?.counts;
		},
	});
};
