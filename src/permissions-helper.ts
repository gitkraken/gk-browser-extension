import type { Permissions } from 'webextension-polyfill';
import { permissions } from 'webextension-polyfill';
import { arrayDifference, CloudProviders } from './shared';

function domainToMatchPattern(domain: string): string {
	return `*://*.${domain}/*`;
}

const RequiredOriginPatterns = [
	// Without this permission, the extension cannot login
	'gitkraken.dev'
].map(domainToMatchPattern);
const CloudProviderOriginPatterns = CloudProviders.map(domainToMatchPattern);

export type OriginTypes = 'required' | 'cloud';

export interface PermissionsRequest {
	request: Permissions.Permissions;
	hasRequired: boolean;
	hasCloud: boolean;
}

export async function refreshPermissions(): Promise<PermissionsRequest | undefined> {
	const exitingPermissions = await permissions.getAll();

	const newRequiredOrigins = arrayDifference(RequiredOriginPatterns, exitingPermissions.origins);
	const newCloudOrigins = arrayDifference(CloudProviderOriginPatterns, exitingPermissions.origins);
	const newOrigins = [...newRequiredOrigins, ...newCloudOrigins];
	const unusedOrigins = arrayDifference(exitingPermissions.origins, [...RequiredOriginPatterns, ...CloudProviderOriginPatterns]);

	if (!unusedOrigins.length) {
		const unusedPermissions: Permissions.Permissions = {
			origins: unusedOrigins
		};
		const result = await permissions.remove(unusedPermissions);
		if (!result) {
			console.warn('Failed to remove unnecessary permissions');
		}
	}
	return newOrigins.length
		? {
			request: {
				origins: newOrigins,
			},
			hasRequired: Boolean(newRequiredOrigins.length),
			hasCloud: Boolean(newCloudOrigins.length)
		}
		: undefined;
}

export async function checkOrigins(origins: string[]): Promise<boolean> {
	return permissions.contains({
		origins: origins.map(domainToMatchPattern)
	});
}
