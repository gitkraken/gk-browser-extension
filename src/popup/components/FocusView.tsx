import type { GitPullRequest, PullRequestBucket } from '@gitkraken/provider-apis';
import { GitHub, GitProviderUtils } from '@gitkraken/provider-apis';
import React, { useEffect, useState } from 'react';
import { fetchProviderToken } from '../../gkApi';

const PullRequestRow = ({ pullRequest }: { pullRequest: GitPullRequest }) => {
	return (
		<div className="pull-request">
			<div className="pull-request-title-and-number">
				<span className="pull-request-title truncate">{pullRequest.title}</span>{' '}
				<a className="pull-request-number" href={pullRequest.url || undefined} target="_blank">
					#{pullRequest.number}
				</a>
			</div>
			<div className="repository-name truncate">{pullRequest.repository.name}</div>
			<a href={pullRequest.url || undefined} target="_blank">
				<i className="fa-regular fa-arrow-up-right-from-square icon" />
			</a>
		</div>
	);
};

const Bucket = ({ bucket }: { bucket: PullRequestBucket }) => {
	return (
		<div className="pull-request-bucket">
			<div className="pull-request-bucket-header">
				<i className={`fa-regular fa-${bucket.faIconName} icon`} />
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

	const filteredBuckets = filterString
		? pullRequestBuckets
				?.map(bucket => ({
					...bucket,
					pullRequests: bucket.pullRequests.filter(pr => pr.title.toLowerCase().includes(filterString)),
				}))
				.filter(bucket => bucket.pullRequests.length)
		: pullRequestBuckets;

	return (
		<div className="focus-view">
			{loadingPullRequests && <i className="fa-regular fa-spinner-third fa-spin" />}
			{pullRequestBuckets && (
				<div className="focus-view-text-filter">
					<i className="fa-regular fa-search icon" />
					<input
						onChange={e => {
							// Extension popups will automatically grow but not automatically shrink. This
							// forces the popup to resize when the amount of content changes.
							document.documentElement.style.height = '0';
							setFilterString(e.target.value.toLocaleLowerCase().trim());
						}}
						placeholder="Search for pull requests"
					/>
					{filterString && <i className="fa-regular fa-times icon" onClick={() => setFilterString('')} />}
				</div>
			)}
			{filteredBuckets?.map(bucket => <Bucket key={bucket.id} bucket={bucket} />)}
		</div>
	);
};
