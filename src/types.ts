import type { Account, GitPullRequest, PullRequestBucket } from '@gitkraken/provider-apis';

export interface User {
	id: string;
	email: string;
	name?: string;
	proAccessState?: {
		trial?: {
			end?: string;
		};
	};
	username: string;
}

// providers: "github" "gitlab" "azure" "bitbucket" "jira" "trello"
export type Provider =
	| 'github'
	| 'gitlab'
	| 'azure'
	| 'bitbucket'
	| 'jira'
	| 'trello'
	| 'githubEnterprise'
	| 'gitlabSelfHosted';

export type FocusViewSupportedProvider = 'github' | 'githubEnterprise' | 'gitlab' | 'bitbucket' | 'azure';

export type GitPullRequestWithUniqueID = GitPullRequest & { uniqueId: string };

export type PullRequestBucketWithUniqueIDs = Omit<PullRequestBucket, 'pullRequests'> & {
	pullRequests: GitPullRequestWithUniqueID[];
};

export type PullRequestDraftCounts = Record<string, { count: number } | undefined>;

export type FocusViewData = {
	providerUser: Account;
	pullRequests: GitPullRequestWithUniqueID[];
};

export interface ProviderConnection {
	provider: Provider;
	type: string;
	domain?: string; // NOTE: This could include the protocol scheme
}

export type ProviderToken = {
	accessToken: string;
	domain: string;
	expiresIn: number;
	scopes: string;
	type: 'oauth' | 'pat';
};

// NOTE: domain here is actually a domain name, not a URI
export type EnterpriseProviderConnection = ProviderConnection & Required<Pick<ProviderConnection, 'domain'>>;

export interface CacheContext {
	enterpriseConnectionsCache?: EnterpriseProviderConnection[];
}
