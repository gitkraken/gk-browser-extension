# GitKraken Browser Extension

## Installation

[Google Chrome](https://chromewebstore.google.com/detail/gitkraken/egmopflbpgdjmmkeabegohajillnebco)

[Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/gitkraken/eehliiniplilmbgcnghhaneefihofjnl)

[Mozilla Firefox](https://addons.mozilla.org/en-US/firefox/addon/gitkraken-browser-extension)

## Features

- Adds an "Open with GitKraken" option to the `Code` dropdowns on GitHub
- Adds a "Checkout with GitKraken" option to the `Code` dropdowns on pull requests on GitHub
- Adds a "Open with GitKraken" button to commit pages on GitHub

## Latest Preview

- Grab the latest release from the [Releases](https://github.com/gitkraken/gitkraken-browser/releases) page
- Go to the extensions page in your browser, e.g. `chrome://extensions` or `edge://extensions`
- Enable "Developer mode"
- Drag the downloaded zip file, `gitkraken-browser*.zip`, and drop it onto the extensions page

## Development

Building this project requires [Node.js](https://yarnpkg.com) and [Yarn](https://yarnpkg.com).

### Install dependencies

```sh
yarn
```

### Developing for Chrome/Edge:

```sh
yarn build:chromium
# OR
yarn watch:chromium
```

Open `chrome://extensions/` or `edge://extensions/`, enable Developer Mode, then drag the `gk-browser-extension` folder onto the page to install the extension.

### Developing for Firefox:

```sh
yarn build:firefox
# OR
yarn watch:firefox
```

Open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", then select any file in the root of the `gk-browser-extension` folder.
