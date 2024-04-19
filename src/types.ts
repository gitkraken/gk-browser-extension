export interface User {
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

export type FocusViewSupportedProvider = 'github' | 'gitlab' | 'bitbucket';

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

export type SessionCacheKey = 'user' | 'providerConnections' | 'focusViewData';

export type CachedFetchResponse<T> = {
	data: T;
	timestamp: number;
};
