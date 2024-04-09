import type { PullRequestBucket } from '@gitkraken/provider-apis';
import { GitHub, GitProviderUtils } from '@gitkraken/provider-apis';
import React, { useEffect, useState } from 'react';
import { fetchProviderToken } from '../../gkApi';

const Bucket = ({ bucket }: { bucket: PullRequestBucket }) => {
	return (
		<div>
			<div>
				<i className={`fa-regular fa-${bucket.faIconName}`} />
				{bucket.name}
			</div>
			{bucket.pullRequests.map(pullRequest => (
				<div key={pullRequest.id}>{pullRequest.title}</div>
			))}
		</div>
	);
};

export const FocusView = () => {
	const [pullRequestBuckets, setPullRequestBuckets] = useState<PullRequestBucket[]>([]);
	const [loadingPullRequests, setLoadingPullRequests] = useState(false);
	useEffect(() => {
		const loadData = async () => {
			const githubToken = await fetchProviderToken('github');
			if (!githubToken) {
				return;
			}

			const providerClient = new GitHub({ token: githubToken.accessToken });
			const { data: providerUser } = await providerClient.getCurrentUser();
			if (!providerUser.username) {
				return;
			}

			setLoadingPullRequests(true);

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

	return (
		<div>
			{loadingPullRequests && <i className="fa-regular fa-spinner-third fa-spin" />}
			{pullRequestBuckets.map(bucket => (
				<Bucket key={bucket.id} bucket={bucket} />
			))}
		</div>
	);
};
