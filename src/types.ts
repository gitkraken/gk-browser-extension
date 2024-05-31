import type { Account, PullRequestWithUniqueID } from '@gitkraken/provider-apis';

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

export type FocusViewSupportedProvider =
	| 'github'
	| 'githubEnterprise'
	| 'gitlab'
	| 'gitlabSelfHosted'
	| 'bitbucket'
	| 'azure';

export type PullRequestDraftCounts = Record<string, { count: number } | undefined>;

export type FocusViewData = {
	providerUser: Account;
	pullRequests: PullRequestWithUniqueID[];
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
