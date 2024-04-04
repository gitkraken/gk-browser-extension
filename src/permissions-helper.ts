import type { Permissions } from 'webextension-polyfill';
import { permissions } from 'webextension-polyfill';
import { arrayDifference, CloudProviders, getEnterpriseConnections } from './shared';
import type { CacheContext } from './types';

function domainToMatchPattern(domain: string): string {
	return `*://*.${domain}/*`;
}

const RequiredOriginPatterns = [
	// Without this permission, the extension cannot login
	'gitkraken.dev',
].map(domainToMatchPattern);
const CloudProviderOriginPatterns = CloudProviders.map(domainToMatchPattern);

async function computeEnterpriseOriginPatterns(context: CacheContext): Promise<string[] | undefined> {
	const enterpriseConnections = await getEnterpriseConnections(context);
	if (!enterpriseConnections) {
		return;
	}
	return enterpriseConnections.map(x => domainToMatchPattern(x.domain));
}

export type OriginTypes = 'required' | 'cloud' | 'enterprise';

export interface PermissionsRequest {
	request: Permissions.Permissions;
	hasRequired: boolean;
	hasCloud: boolean;
	hasEnterprise: boolean;
}

export async function refreshPermissions(context: CacheContext): Promise<PermissionsRequest | undefined> {
	const exitingPermissions = await permissions.getAll();

	const newRequiredOrigins = arrayDifference(RequiredOriginPatterns, exitingPermissions.origins);
	const enterpriseOrigins = await computeEnterpriseOriginPatterns(context);
	const newEnterpriseOrigins = arrayDifference(enterpriseOrigins, exitingPermissions.origins);
	const newCloudOrigins = arrayDifference(CloudProviderOriginPatterns, exitingPermissions.origins);
	const newOrigins = [...newRequiredOrigins, ...newEnterpriseOrigins, ...newCloudOrigins];
	const unusedOrigins = arrayDifference(exitingPermissions.origins, [
		...RequiredOriginPatterns,
		...CloudProviderOriginPatterns,
		...(enterpriseOrigins ?? []),
	]);

	if (!unusedOrigins.length) {
		const unusedPermissions: Permissions.Permissions = {
			origins: unusedOrigins,
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
				hasCloud: Boolean(newCloudOrigins.length),
				hasEnterprise: Boolean(newEnterpriseOrigins.length),
		  }
		: undefined;
}

export async function checkOrigins(origins: string[]): Promise<boolean> {
	return permissions.contains({
		origins: origins.map(domainToMatchPattern),
	});
}
