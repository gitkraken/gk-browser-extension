/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const root = path.dirname(__filename);

const manifestJsonPath = path.join('manifest.json');
const packageJson = require('../package.json');

const manifestBase = {
	manifest_version: 3,
	name: packageJson['name'],
	description: packageJson['description'],
	version: packageJson['version'],
	icons: {
		16: 'icons/gk-grey-16.png',
		32: 'icons/gk-grey-32.png',
		48: 'icons/gk-grey-48.png',
		128: 'icons/gk-grey-128.png',
	},
	permissions: ['cookies', 'scripting', 'webNavigation'],
	host_permissions: [
		'*://*.github.com/*',
		'*://*.gitlab.com/*',
		'*://*.bitbucket.org/*',
		'*://*.dev.azure.com/*',
		'*://*.gitkraken.dev/*',
	],
	action: {
		default_popup: 'static/popup.html',
	},
};

const getMakeManifest =
	isFirefox =>
	(force = false) => {
		const firefoxKeys = {
			background: {
				scripts: ['dist/background.js'],
			},
			browser_specific_settings: {
				gecko: {
					id: 'gitkraken-browser@gitkraken.com',
					strict_min_version: '109.0',
				},
			},
			// Delete this in favor of optional_host_permissions when https://bugzilla.mozilla.org/show_bug.cgi?id=1766026
			// is resolved
			optional_permissions: ['*://*/*'],
		};

		const chromiumKeys = {
			background: {
				service_worker: 'dist/service-worker.js',
			},
			optional_host_permissions: [
				// TODO: Move this to `manifestBase` when Firefox supports optional_host_permissions
				'*://*/*',
			],
		};

		const manifest = {
			...manifestBase,
			...(isFirefox ? firefoxKeys : chromiumKeys),
		};

		if (!fs.existsSync(manifestJsonPath) || force) {
			console.log('building', manifestJsonPath);
			fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2) + '\n');
		}
	};

const getEnsureManifest = (makeFireFoxManifest, makeChromiumManifest) => () => {
	if (!fs.existsSync(manifestJsonPath)) {
		console.log(`manifest.json does not exist, creating ${process.env.FIREFOX ? 'firefox' : 'chromium'} manifest`);
		if (process.env.FIREFOX) {
			makeFireFoxManifest();
		} else {
			makeChromiumManifest();
		}
	}
};

module.exports = {
	makeChromiumManifest: getMakeManifest(false),
	makeFirefoxManifest: getMakeManifest(true),
	ensureManifest: getEnsureManifest(getMakeManifest(false), getMakeManifest(true)),
};
