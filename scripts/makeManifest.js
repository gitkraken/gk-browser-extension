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
		16: 'icons/logo-16.png',
		32: 'icons/logo-32.png',
		48: 'icons/logo-48.png',
		128: 'icons/logo-128.png',
	},
	permissions: ['scripting', 'webNavigation'],
	host_permissions: ['*://*.github.com/*', '*://*.gitlab.com/*', '*://*.bitbucket.org/*'],
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
		};

		const chromiumKeys = {
			background: {
				service_worker: 'dist/service-worker.js',
			},
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
