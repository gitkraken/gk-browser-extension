import { action } from 'webextension-polyfill';

export const PopupInitMessage = 'popupInit';

const IconPaths = {
	Grey: {
		16: '/icons/gk-grey-16.png',
		32: '/icons/gk-grey-32.png',
		48: '/icons/gk-grey-48.png',
		128: '/icons/gk-grey-128.png',
	},
	Green: {
		16: '/icons/gk-green-16.png',
		32: '/icons/gk-green-32.png',
		48: '/icons/gk-green-48.png',
		128: '/icons/gk-green-128.png',
	},
};

export const CloudProviders = [
	'github.com',
	'gitlab.com',
	'bitbucket.org',
	'dev.azure.com',
];

export const updateExtensionIcon = (isLoggedIn: boolean) =>
	action.setIcon({ path: isLoggedIn ? IconPaths.Green : IconPaths.Grey });

// Basically ramda's difference() function but it accepts undefined as empty arrays
export function arrayDifference<T>(first: T[] | undefined, second: T[] | undefined): T[] {
	if (!first) {
		return [];
	}
	if (!second) {
		return first;
	}
	return first.filter(x => !second.includes(x));
}
