import type { GitPullRequest, PullRequestBucket } from '@gitkraken/provider-apis';
import { GitHub, GitProviderUtils } from '@gitkraken/provider-apis';
import React, { useEffect, useState } from 'react';
import { storage } from 'webextension-polyfill';
import { fetchProviderToken } from '../../gkApi';
import { DefaultCacheTimeMinutes, sessionCachedFetch } from '../../shared';

const PullRequestRow = ({ pullRequest }: { pullRequest: GitPullRequest }) => {
	return (
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
			>
				#{pullRequest.number}
			</a>
			{/* <a>
				<i className="fa-brands fa-gitkraken icon text-link" />
			</a> */}
		</div>
	);
};

const Bucket = ({ bucket }: { bucket: PullRequestBucket }) => {
	return (
		<div className="pull-request-bucket">
			<div className="pull-request-bucket-header text-sm text-secondary bold">
				<i className={`fa-regular fa-${bucket.faIconName} icon text-lg`} />
				{bucket.name}
			</div>
			{bucket.pullRequests.map(pullRequest => (
				<PullRequestRow key={pullRequest.id} pullRequest={pullRequest} />
			))}
		</div>
	);
};

export const FocusView = () => {
	const [pullRequestBuckets, setPullRequestBuckets] = useState<PullRequestBucket[]>();
	const [loadingPullRequests, setLoadingPullRequests] = useState(true);
	const [filterString, setFilterString] = useState('');

	useEffect(() => {
		const loadData = async () => {
			const focusViewData = await sessionCachedFetch('focusViewData', DefaultCacheTimeMinutes, async () => {
				const githubToken = await fetchProviderToken('github');
				if (!githubToken) {
					return null;
				}

				const providerClient = new GitHub({ token: githubToken.accessToken });
				const { data: providerUser } = await providerClient.getCurrentUser();
				if (!providerUser.username) {
					return null;
				}

				const { data: pullRequests } = await providerClient.getPullRequestsAssociatedWithUser({
					username: providerUser.username,
				});

				return { providerUser: providerUser, pullRequests: pullRequests };
			});

			if (!focusViewData) {
				setLoadingPullRequests(false);
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
			setLoadingPullRequests(false);
		};

		void loadData();
	}, []);

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

	if (loadingPullRequests) {
		return (
			<div className="focus-view text-center">
				<i className="fa-regular fa-spinner-third fa-spin" />
			</div>
		);
	}

	return (
		<div className="focus-view">
			{pullRequestBuckets && (
				<div className="focus-view-text-filter">
					<i className="fa-regular fa-search icon text-xl" />
					<input
						onChange={e => setFilterString(e.target.value)}
						placeholder="Search for pull requests"
						value={filterString}
					/>
					{filterString && (
						<i className="fa-regular fa-times icon text-xl" onClick={() => setFilterString('')} />
					)}
				</div>
			)}
			<div className="pull-request-buckets">
				{filteredBuckets?.map(bucket => <Bucket key={bucket.id} bucket={bucket} />)}
			</div>
		</div>
	);
};
