import type { GitPullRequest, PullRequestBucket } from '@gitkraken/provider-apis';
import { GitHub, GitProviderUtils } from '@gitkraken/provider-apis';
import React, { useEffect, useState } from 'react';
import { fetchProviderToken } from '../../gkApi';

const PullRequestRow = ({ pullRequest }: { pullRequest: GitPullRequest }) => {
	return (
		<div className="pull-request">
			<div className="pull-request-title-and-number">
				<span className="pull-request-title truncate">{pullRequest.title}</span>{' '}
				<a className="text-link" href={pullRequest.url || undefined} target="_blank">
					#{pullRequest.number}
				</a>
			</div>
			<div className="repository-name text-secondary truncate">{pullRequest.repository.name}</div>
			<a href={pullRequest.url || undefined} target="_blank">
				<i className="fa-regular fa-arrow-up-right-from-square icon" />
			</a>
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
			const githubToken = await fetchProviderToken('github');
			if (!githubToken) {
				setLoadingPullRequests(false);
				return;
			}

			const providerClient = new GitHub({ token: githubToken.accessToken });
			const { data: providerUser } = await providerClient.getCurrentUser();
			if (!providerUser.username) {
				setLoadingPullRequests(false);
				return;
			}

			const { data: pullRequests } = await providerClient.getPullRequestsAssociatedWithUser({
				username: providerUser.username,
			});

			const bucketsMap = GitProviderUtils.groupPullRequestsIntoBuckets(pullRequests, providerUser);
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
						onChange={e => {
							// Extension popups will automatically grow but not automatically shrink. This
							// forces the popup to resize when the amount of content changes.
							document.documentElement.style.height = '0';
							setFilterString(e.target.value);
						}}
						placeholder="Search for pull requests"
						value={filterString}
					/>
					{filterString && (
						<i className="fa-regular fa-times icon text-xl" onClick={() => setFilterString('')} />
					)}
				</div>
			)}
			{filteredBuckets?.map(bucket => <Bucket key={bucket.id} bucket={bucket} />)}
		</div>
	);
};
