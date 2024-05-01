import { GitProviderUtils } from '@gitkraken/provider-apis';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { storage } from 'webextension-polyfill';
import { openGitKrakenDeepLink } from '../../deepLink';
import { ProviderMeta } from '../../providers';
import { GKDotDevUrl } from '../../shared';
import type {
	FocusViewSupportedProvider,
	GitPullRequestWithUniqueID,
	PullRequestBucketWithUniqueIDs,
} from '../../types';
import { useFocusViewConnectedProviders, useFocusViewDataQuery, usePullRequestDraftCountsQuery } from '../hooks';
import { ConnectAProvider } from './ConnectAProvider';

type PullRequestRowProps = {
	userId: string;
	pullRequest: GitPullRequestWithUniqueID;
	provider: FocusViewSupportedProvider;
	draftCount?: number;
};

const PullRequestRow = ({ userId, pullRequest, provider, draftCount = 0 }: PullRequestRowProps) => {
	const queryClient = useQueryClient();

	return (
		<>
			<div className="pull-request">
				<div className="pull-request-title truncate">{pullRequest.title}</div>
				<div className="repository-name text-secondary truncate">{pullRequest.repository.name}</div>
				<div className="pull-request-number">
					<a
						className="text-link"
						href={pullRequest.url || undefined}
						target="_blank"
						onClick={() => {
							// Since there is a decent chance that the PR will be acted upon after the user clicks on it,
							// mark the focus view data as stale so that it will be refetched when the user returns.
							void queryClient.invalidateQueries({ queryKey: [userId, 'focusViewData', provider] });
						}}
						title={`View pull request on ${ProviderMeta[provider].name}`}
					>
						#{pullRequest.number}
					</a>
				</div>
				{pullRequest.url && (
					<a
						href="#"
						onClick={() => {
							openGitKrakenDeepLink(provider, pullRequest.url);
						}}
						title="Open with GitKraken"
					>
						<i className="fa-brands fa-gitkraken icon text-link text-lg" />
					</a>
				)}
			</div>
			{draftCount > 0 && (
				<a
					className="pr-drafts-badge text-disabled"
					href={`${GKDotDevUrl}/drafts/suggested-change/${encodeURIComponent(
						btoa(pullRequest.uniqueId),
					)}?source=browserExtension`}
					target="_blank"
					title={`View code suggestion${draftCount === 1 ? '' : 's'} on gitkraken.dev`}
				>
					<i className="fa-regular fa-message-code icon" />
					Code Suggestion{draftCount === 1 ? '' : 's'}
				</a>
			)}
		</>
	);
};

type BucketProps = {
	userId: string;
	bucket: PullRequestBucketWithUniqueIDs;
	provider: FocusViewSupportedProvider;
	prDraftCountsByEntityID?: Record<string, { count: number } | undefined>;
};

const Bucket = ({ userId, bucket, provider, prDraftCountsByEntityID }: BucketProps) => {
	return (
		<div className="pull-request-bucket">
			<div className="pull-request-bucket-header text-sm text-secondary bold">
				<i className={`fa-regular fa-${bucket.faIconName} icon text-lg`} />
				{bucket.name}
			</div>
			{bucket.pullRequests.map(pullRequest => (
				<PullRequestRow
					key={pullRequest.id}
					userId={userId}
					pullRequest={pullRequest}
					provider={provider}
					draftCount={prDraftCountsByEntityID?.[pullRequest.uniqueId]?.count}
				/>
			))}
		</div>
	);
};

export const FocusView = ({ userId }: { userId: string }) => {
	const [selectedProvider, setSelectedProvider] = useState<FocusViewSupportedProvider | null | undefined>();
	const [filterString, setFilterString] = useState('');

	const connectedProviders = useFocusViewConnectedProviders(userId);
	const focusViewDataQuery = useFocusViewDataQuery(userId, selectedProvider);
	const prDraftCountsQuery = usePullRequestDraftCountsQuery(
		userId,
		selectedProvider,
		focusViewDataQuery.data?.pullRequests,
	);

	// This effect sets which provider is selected after the provider connections are loaded/changed
	useEffect(() => {
		const selectInitialProvider = async () => {
			if (!connectedProviders) {
				return;
			}

			if (connectedProviders && connectedProviders.length > 0) {
				const { focusViewSelectedProvider } = await storage.local.get('focusViewSelectedProvider');

				const providerToSelect =
					focusViewSelectedProvider && connectedProviders.includes(focusViewSelectedProvider)
						? (focusViewSelectedProvider as FocusViewSupportedProvider)
						: connectedProviders[0];

				setSelectedProvider(providerToSelect);
				void storage.local.set({ focusViewSelectedProvider: providerToSelect });
			} else {
				setSelectedProvider(null);
				void storage.local.remove('focusViewSelectedProvider');
			}
		};

		void selectInitialProvider();
	}, [connectedProviders]);

	const pullRequestBuckets = useMemo(() => {
		if (!focusViewDataQuery.data) {
			return null;
		}

		const bucketsMap = GitProviderUtils.groupPullRequestsIntoBuckets(
			focusViewDataQuery.data.pullRequests,
			focusViewDataQuery.data.providerUser,
		);
		return Object.values(bucketsMap)
			.filter(bucket => bucket.pullRequests.length)
			.sort((a, b) => a.priority - b.priority);
	}, [focusViewDataQuery.data]);

	const lowercaseFilterString = filterString.toLowerCase().trim();
	const filteredBuckets = lowercaseFilterString
		? pullRequestBuckets
				?.map(bucket => ({
					...bucket,
					pullRequests: bucket.pullRequests.filter(pr =>
						pr.title.toLowerCase().includes(lowercaseFilterString),
					),
				}))
				.filter(bucket => bucket.pullRequests.length)
		: pullRequestBuckets;

	const onProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		void storage.local.set({ focusViewSelectedProvider: e.target.value });
		setSelectedProvider(e.target.value as FocusViewSupportedProvider);
		setFilterString('');
	};

	if (selectedProvider === undefined) {
		return (
			<div className="focus-view text-center">
				<i className="fa-regular fa-spinner-third fa-spin" />
			</div>
		);
	}

	if (!selectedProvider) {
		return <ConnectAProvider />;
	}

	return (
		<div className="focus-view">
			{selectedProvider && (
				<div className="focus-view-text-filter">
					<i className="fa-regular fa-search icon text-xl" />
					<input
						disabled={focusViewDataQuery.isLoading}
						onChange={e => setFilterString(e.target.value)}
						placeholder="Search for pull requests"
						value={filterString}
					/>
					{filterString && (
						<i className="fa-regular fa-times icon text-xl" onClick={() => setFilterString('')} />
					)}
				</div>
			)}
			{selectedProvider && connectedProviders && connectedProviders.length > 1 && (
				<div className="provider-select text-secondary">
					PRs: <img src={ProviderMeta[selectedProvider].iconSrc} height={14} />
					<select
						className="text-secondary"
						value={selectedProvider}
						onChange={onProviderChange}
						disabled={focusViewDataQuery.isLoading}
					>
						{connectedProviders.map(provider => (
							<option key={provider} value={provider}>
								{ProviderMeta[provider].name}
							</option>
						))}
					</select>
				</div>
			)}
			{focusViewDataQuery.isLoading ? (
				<div className="text-center">
					<i className="fa-regular fa-spinner-third fa-spin" />
				</div>
			) : (
				<div className="pull-request-buckets">
					{filteredBuckets?.map(bucket => (
						<Bucket
							key={bucket.id}
							userId={userId}
							bucket={bucket as PullRequestBucketWithUniqueIDs}
							provider={selectedProvider}
							prDraftCountsByEntityID={prDraftCountsQuery.data}
						/>
					))}
				</div>
			)}
		</div>
	);
};
