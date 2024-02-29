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

export enum Provider {
	GITHUB_ENTERPRISE = 'githubEnterprise',
}

export interface ProviderConnection {
	provider: Provider;
	type: string;
	domain?: string; // NOTE: This could include the protocol scheme
}

// NOTE: domain here is actually a domain name, not a URI
export type EnterpriseProviderConnection = ProviderConnection & Required<Pick<ProviderConnection, 'domain'>>;

export interface CacheContext {
	enterpriseConnectionsCache?: EnterpriseProviderConnection[];
}
