/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const root = path.dirname(__filename)

const manifestJsonPath = path.join('manifest.json');
const packageJson = require('../package.json')

const manifestBase = {
  "manifest_version": 3,
  "name": packageJson["name"],
  "description": packageJson["description"],
  "version": packageJson["version"],
  "icons": {
    "16": "icons/logo-16.png",
    "32": "icons/logo-32.png",
    "48": "icons/logo-48.png",
    "128": "icons/logo-128.png"
  },
  "permissions": [
    "scripting",
    "webNavigation"
  ],
  "host_permissions": [
    "*://*.github.com/*",
    "*://*.gitlab.com/*",
    "*://*.bitbucket.org/*"
  ]
};

const getMakeManifest = (isFirefox) => (force = false) => {
  const firefoxKeys = {
    background: {
      scripts: ["dist/background.js"]
    }
  };

  const chromiumKeys = {
    background: {
      "service_worker": "dist/service-worker.js"
    }
  };

  const manifest = {
    ...manifestBase,
    ...(isFirefox ? firefoxKeys : chromiumKeys)
  };

  if (!fs.existsSync(manifestJsonPath) || force) {
    console.log('building', manifestJsonPath);
    fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2) + '\n');
  }
}

module.exports = {
  makeChromiumManifest: getMakeManifest(false),
  makeFirefoxManifest: getMakeManifest(true)
}

if (require.main === module && !fs.existsSync()) {
  if (process.env.FIREFOX) {
    makeFirefoxManifest();
  } else {
    makeChromiumManifest();
  }
}