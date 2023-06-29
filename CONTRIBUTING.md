# Contributing

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

When contributing to this project, please first discuss the changes you wish to make via an issue before making changes.

Please note the [Code of Conduct](CODE_OF_CONDUCT.md) document, please follow it in all your interactions with this project.

## Your First Code Contribution

Unsure where to begin contributing? You can start by looking through the [`help-wanted`](https://github.com/gitkraken/gitkraken-browser/labels/help-wanted) issues.

### Getting the code

```
git clone https://github.com/gitkraken/gitkraken-browser.git
```

Prerequisites

- [Git](https://git-scm.com/), `>= 2.7.2`
- [NodeJS](https://nodejs.org/), `>= 16.14.2`
- [yarn](https://yarnpkg.com/), `>= 1.22.19`

### Dependencies

From a terminal, where you have cloned the repository, execute the following command to install the required dependencies:

```
yarn
```

### Build

From a terminal, where you have cloned the repository, execute the following command to re-build the project from scratch:

```
yarn run build
```

### Watch

During development you can use a watcher to make builds on changes quick and easy. From a terminal, where you have cloned the repository, execute the following command:

```
yarn run watch
```

Or use the provided `watch` task in VS Code, execute the following from the command palette (be sure there is no `>` at the start):

```
task watch
```

This will first do an initial full build and then watch for file changes, compiling those changes incrementally, enabling a fast, iterative coding experience.

👉 **Tip!** You can press <kbd>CMD+SHIFT+B</kbd> (<kbd>CTRL+SHIFT+B</kbd> on Windows, Linux) to start the watch task.

👉 **Tip!** You don't need to stop and restart the development version of Code after each change. You can just execute `Reload Window` from the command palette.

### Formatting

This project uses [prettier](https://prettier.io/) for code formatting. You can run prettier across the code by calling `yarn run pretty` from a terminal.

To format the code as you make changes you can install the [Prettier - Code formatter](https://marketplace.visualstudio.com/items/esbenp.prettier-vscode) extension.

Add the following to your User Settings to run prettier:

```
"editor.formatOnSave": true,
```

### Linting

This project uses [ESLint](https://eslint.org/) for code linting. You can run ESLint across the code by calling `yarn run lint` from a terminal. Warnings from ESLint show up in the `Errors and Warnings` quick box and you can navigate to them from inside VS Code.

To lint the code as you make changes you can install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension.

### Debugging

### Firefox

To run and debug the project for Firefox, execute the following from a terminal:

```
yarn build:firefox
```

or

```
yarn watch:firefox
```

to run the addon in the browser, run

```
`web-ext run --browser-console`
```

> web-ext is a tool for developing WebExtensions for Firefox and can be installed with `npm install --global web-ext`

or

add any file this folder to the [Firefox Add-on Debugger](about:debugging#/runtime/this-firefox)

### Chrome/Edge

To run and debug the project for Chrome or Edge, execute the following from a terminal:

```
yarn build:chromium
```

or

```
yarn watch:chromium
```

To run the extension in the browser, first add your extension to the browser in `chrome://extensions/` or `edge://extensions/`. Then, turn on developer mode. Lastly, load this folder as an unpacked extension.

### Testing

Tests are run by loading the built chromium extension into a persisten chrome browser controlled by playwright. Firefox testing is currently not supported. 

To run the tests, execute the following from a terminal:
    
```
yarn build:chromium
yarn test
```
When working on a test, it might be useful to temporarily remove the browser context argument of `--headless=new` to see the browser the tests are running in.

### Bundling

To generate a production bundle (without packaging) run the following from a terminal:

```
yarn run bundle
```

To generate a ZIP run the following from a terminal:

```
yarn run package
```

## Submitting a Pull Request

Please follow all the instructions in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## Publishing

TBD
