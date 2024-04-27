import type { PullRequestBucket } from '@gitkraken/provider-apis';
import { GitProviderUtils } from '@gitkraken/provider-apis';
import React, { useEffect, useState } from 'react';
import { storage } from 'webextension-polyfill';
import { fetchDraftCounts, fetchProviderConnections } from '../../gkApi';
import { fetchFocusViewData, ProviderMeta } from '../../providers';
import { DefaultCacheTimeMinutes, GKDotDevUrl, sessionCachedFetch } from '../../shared';
import type {
	FocusViewData,
	FocusViewSupportedProvider,
	GitPullRequestWithUniqueID,
	PullRequestBucketWithUniqueIDs,
} from '../../types';
import { ConnectAProvider } from './ConnectAProvider';

type PullRequestRowProps = {
	pullRequest: GitPullRequestWithUniqueID;
	provider: FocusViewSupportedProvider;
	draftCount?: number;
};

const PullRequestRow = ({ pullRequest, provider, draftCount = 0 }: PullRequestRowProps) => {
	return (
		<>
			<div className="pull-request">
				<div className="pull-request-title truncate">{pullRequest.title}</div>
				<div className="repository-name text-secondary truncate">{pullRequest.repository.name}</div>
				<a
					className="pull-request-number text-link"
					href={pullRequest.url || undefined}
					target="_blank"
					onClick={() => {
						// Since there is a decent chance that the PR will be acted upon after the user clicks on it,
						// invalidate the cache so that the PR shows up in the appropriate bucket (or not at all) the
						// next time the popup is opened.
						void storage.session.remove('focusViewData');
					}}
					title={`View pull request on ${ProviderMeta[provider].name}`}
				>
					#{pullRequest.number}
				</a>
				{/* <a>
				<i className="fa-brands fa-gitkraken icon text-link" />
			</a> */}
			</div>
			{draftCount > 0 && (
				<a
					className="pr-drafts-badge text-disabled"
					href={`${GKDotDevUrl}/drafts/suggested-change/${encodeURIComponent(btoa(pullRequest.uniqueId))}`}
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
	bucket: PullRequestBucketWithUniqueIDs;
	provider: FocusViewSupportedProvider;
	prDraftCountsByEntityID: Record<string, { count: number } | undefined>;
};

const Bucket = ({ bucket, provider, prDraftCountsByEntityID }: BucketProps) => {
	return (
		<div className="pull-request-bucket">
			<div className="pull-request-bucket-header text-sm text-secondary bold">
				<i className={`fa-regular fa-${bucket.faIconName} icon text-lg`} />
				{bucket.name}
			</div>
			{bucket.pullRequests.map(pullRequest => (
				<PullRequestRow
					key={pullRequest.id}
					pullRequest={pullRequest}
					provider={provider}
					draftCount={prDraftCountsByEntityID[pullRequest.uniqueId]?.count}
				/>
			))}
		</div>
	);
};

export const FocusView = () => {
	const [connectedProviders, setConnectedProviders] = useState<FocusViewSupportedProvider[]>([]);
	const [selectedProvider, setSelectedProvider] = useState<FocusViewSupportedProvider>();
	const [prDraftCountsByEntityID, setPRDraftCountsByEntityID] = useState<
		Record<string, { count: number } | undefined>
	>({});
	const [pullRequestBuckets, setPullRequestBuckets] = useState<PullRequestBucket[]>();
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [isLoadingPullRequests, setIsLoadingPullRequests] = useState(true);
	const [filterString, setFilterString] = useState('');

	useEffect(() => {
		const loadData = async () => {
			const [providerConnections, { focusViewSelectedProvider: savedSelectedProvider }] = await Promise.all([
				fetchProviderConnections(),
				storage.local.get('focusViewSelectedProvider'),
			]);

			const supportedProviders = (providerConnections || [])
				.filter(
					connection =>
						(connection.provider === 'github' ||
							connection.provider === 'gitlab' ||
							connection.provider === 'bitbucket' ||
							connection.provider === 'azure') &&
						!connection.domain,
				)
				.map(connection => connection.provider as FocusViewSupportedProvider);

			setConnectedProviders(supportedProviders);

			if (supportedProviders && supportedProviders.length > 0) {
				const providerToSelect =
					savedSelectedProvider && supportedProviders.includes(savedSelectedProvider)
						? (savedSelectedProvider as FocusViewSupportedProvider)
						: supportedProviders[0];

				setSelectedProvider(providerToSelect);
				void storage.local.set({ focusViewSelectedProvider: providerToSelect });
			} else {
				setIsLoadingPullRequests(false);
				setIsFirstLoad(false);
				// Clear the cache so that if the user connects a provider, we'll fetch it the next
				// time the popup is opened.
				void storage.session.remove('providerConnections');
			}
		};

		void loadData();
	}, []);

	useEffect(() => {
		const loadData = async () => {
			if (!selectedProvider) {
				return;
			}

			setIsLoadingPullRequests(true);

			let focusViewData: FocusViewData | null = null;
			try {
				focusViewData = await sessionCachedFetch('focusViewData', DefaultCacheTimeMinutes, () =>
					fetchFocusViewData(selectedProvider),
				);
			} catch (e) {
				// If there was an error, fall through to the next if block to at least end the loading state.
			}

			if (!focusViewData) {
				setPullRequestBuckets([]);
				setIsLoadingPullRequests(false);
				setIsFirstLoad(false);
				return;
			}

			const bucketsMap = GitProviderUtils.groupPullRequestsIntoBuckets(
				focusViewData.pullRequests,
				focusViewData.providerUser,
			);
			const buckets = Object.values(bucketsMap)
				.filter(bucket => bucket.pullRequests.length)
				.sort((a, b) => a.priority - b.priority);

			setPullRequestBuckets(buckets);
			setIsLoadingPullRequests(false);
			setIsFirstLoad(false);

			if (selectedProvider === 'github' && focusViewData.pullRequests.length) {
				const draftCounts = await sessionCachedFetch('focusViewDraftCounts', DefaultCacheTimeMinutes, () => {
					if (!focusViewData) {
						return null;
					}
					const prUniqueIds = focusViewData.pullRequests.map(pr => pr.uniqueId);
					return fetchDraftCounts(prUniqueIds);
				});
				if (draftCounts) {
					setPRDraftCountsByEntityID(draftCounts.counts);
				}
			}
		};

		void loadData();
	}, [selectedProvider]);

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
		void storage.session.remove(['focusViewData', 'focusViewDraftCounts']);
		void storage.local.set({ focusViewSelectedProvider: e.target.value });
		setSelectedProvider(e.target.value as FocusViewSupportedProvider);
		setFilterString('');
	};

	if (isFirstLoad) {
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
						disabled={isLoadingPullRequests}
						onChange={e => setFilterString(e.target.value)}
						placeholder="Search for pull requests"
						value={filterString}
					/>
					{filterString && (
						<i className="fa-regular fa-times icon text-xl" onClick={() => setFilterString('')} />
					)}
				</div>
			)}
			{selectedProvider && connectedProviders.length > 1 && (
				<div className="provider-select text-secondary">
					PRs: <img src={ProviderMeta[selectedProvider].iconSrc} height={14} />
					<select
						className="text-secondary"
						value={selectedProvider}
						onChange={onProviderChange}
						disabled={isLoadingPullRequests}
					>
						{connectedProviders.map(provider => (
							<option key={provider} value={provider}>
								{ProviderMeta[provider].name}
							</option>
						))}
					</select>
				</div>
			)}
			{isLoadingPullRequests ? (
				<div className="text-center">
					<i className="fa-regular fa-spinner-third fa-spin" />
				</div>
			) : (
				<div className="pull-request-buckets">
					{filteredBuckets?.map(bucket => (
						<Bucket
							key={bucket.id}
							bucket={bucket as PullRequestBucketWithUniqueIDs}
							provider={selectedProvider}
							prDraftCountsByEntityID={prDraftCountsByEntityID}
						/>
					))}
				</div>
			)}
		</div>
	);
};
