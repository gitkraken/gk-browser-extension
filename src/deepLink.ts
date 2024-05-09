import type { LinkTarget } from './provider';
import { GKDotDevUrl } from './shared';
import type { FocusViewSupportedProvider } from './types';

const getGKDotDevLinkUrl = (redirectUrlString: string) => {
	const redirectUrl = new URL(redirectUrlString);
	const deepLinkUrl = `${GKDotDevUrl}/link`;
	const deepLink = new URL(`${deepLinkUrl}/${encodeURIComponent(btoa(redirectUrl.toString()))}`);
	deepLink.searchParams.set('referrer', 'extension');
	if (redirectUrl.searchParams.get('pr')) {
		deepLink.searchParams.set('context', 'pr');
	}

	return deepLink.toString();
};

const getGitHubRedirectUrl = (url: string, target: LinkTarget) => {
	const uri = new URL(url);
	let [, owner, repo, type, ...rest] = uri.pathname.split('/');
	if (rest?.length) {
		rest = rest.filter(Boolean);
	}

	const repoId = '-';

	let redirectUrl: URL | null = null;
	switch (type) {
		case 'pull': {
			const [prNumber] = rest;
			redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
			redirectUrl.searchParams.set('pr', prNumber);
			redirectUrl.searchParams.set('prUrl', uri.toString());
			break;
		}
		default:
			redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
			break;
	}

	const remoteUrl = new URL(uri.toString());
	remoteUrl.hash = '';
	remoteUrl.search = '';
	remoteUrl.pathname = `/${owner}/${repo}.git`;

	redirectUrl.searchParams.set('url', remoteUrl.toString());
	return redirectUrl.toString();
};

const parseGitLabUrl = (
	rawUrl: string,
): {
	owner: string;
	subgroups: string[];
	repo: string;
	type: string | undefined;
	rest: string[];
} => {
	// remove slash at the end of the pathname
	const path = rawUrl.endsWith('/') ? rawUrl.substring(0, rawUrl.length - 1) : rawUrl;

	const split = path.split('/');
	const separatorIndex = split.findIndex(value => value == '-');

	// if we couldn't find a separator index, assume that we're on the front page of a repository
	if (separatorIndex === -1) {
		return {
			owner: split[1],
			subgroups: split.slice(2, split.length - 1),
			repo: split[split.length - 1],
			type: undefined,
			rest: [],
		};
	}

	return {
		owner: split[1],
		subgroups: split.slice(2, separatorIndex - 1),
		repo: split[separatorIndex - 1],
		type: split.at(separatorIndex + 1),
		rest: separatorIndex + 2 < split.length ? split.slice(separatorIndex + 2, split.length) : [],
	};
};

const getGitLabRedirectUrl = (url: string, target: LinkTarget) => {
	const uri = new URL(url);
	const { owner, repo, type, rest } = parseGitLabUrl(uri.pathname);

	const repoId = '-';

	let redirectUrl: URL | null = null;
	switch (type) {
		case 'merge_requests': {
			const [prNumber] = rest;
			redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
			redirectUrl.searchParams.set('pr', prNumber);
			redirectUrl.searchParams.set('prUrl', uri.toString());
			break;
		}
		default: {
			redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
			break;
		}
	}

	const remoteUrl = new URL(uri.toString());
	remoteUrl.hash = '';
	remoteUrl.search = '';
	remoteUrl.pathname = `/${owner}/${repo}.git`;

	redirectUrl.searchParams.set('url', remoteUrl.toString());
	return redirectUrl.toString();
};

const getBitbucketRedirectUrl = (url: string, target: LinkTarget) => {
	const uri = new URL(url);
	let [, owner, repo, type, ...rest] = uri.pathname.split('/');
	if (rest?.length) {
		rest = rest.filter(Boolean);
	}

	const repoId = '-';

	let redirectUrl: URL | null = null;
	switch (type) {
		case 'pull-requests': {
			const [prNumber] = rest;
			redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
			redirectUrl.searchParams.set('pr', prNumber);
			redirectUrl.searchParams.set('prUrl', uri.toString());
			break;
		}
		default:
			redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
			break;
	}

	const remoteUrl = new URL(uri.toString());
	remoteUrl.hash = '';
	remoteUrl.search = '';
	remoteUrl.pathname = `/${owner}/${repo}.git`;

	redirectUrl.searchParams.set('url', remoteUrl.toString());
	return redirectUrl.toString();
};

const parseAzurePathname = (
	pathname: string,
): {
	org: string;
	project: string;
	repo: string;
	type: string | undefined;
	urlTarget: string;
} => {
	// the default repo of a project has the same name and has a url that is formatted
	// slightly differently than a repo that doesn't share the same name as the project
	let project = '';
	let repo = '';
	let type = '';
	let urlTarget = '';

	const [, org, ...rest] = pathname.split('/');
	if (rest[0] === '_git') {
		[, project, type, urlTarget] = rest;
		repo = project;
	} else {
		[project, , repo, type, urlTarget] = rest;
	}

	return { org: org, project: project, repo: repo, type: type, urlTarget: urlTarget };
};

const getAzureRedirectUrl = (url: string, target: LinkTarget) => {
	const uri = new URL(url);
	const { pathname, searchParams: search } = uri;
	const { org, project, repo, type, urlTarget } = parseAzurePathname(pathname);

	const repoId = '-';

	let redirectUrl: URL | null = null;
	switch (type) {
		case 'pullrequest': {
			const prNumber = urlTarget;
			redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
			redirectUrl.searchParams.set('pr', prNumber);
			redirectUrl.searchParams.set('prUrl', uri.toString());
			break;
		}
		default: {
			const branch = search.get('version')?.slice(2);
			if (branch) {
				redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/b/${branch}`);
			} else {
				redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
			}
			break;
		}
	}

	const remoteUrl = `https://${org}@dev.azure.com/${org}/${project}/_git/${repo}`;
	redirectUrl.searchParams.set('url', remoteUrl.toString());
	return redirectUrl.toString();
};

export const getGitKrakenDeepLinkUrl = (provider: FocusViewSupportedProvider, url: string | null) => {
	if (!url) {
		return null;
	}

	let redirectUrl = '';
	switch (provider) {
		case 'github':
			redirectUrl = getGitHubRedirectUrl(url, 'vscode');
			break;
		case 'gitlab':
			redirectUrl = getGitLabRedirectUrl(url, 'vscode');
			break;
		case 'bitbucket':
			redirectUrl = getBitbucketRedirectUrl(url, 'vscode');
			break;
		case 'azure':
			redirectUrl = getAzureRedirectUrl(url, 'vscode');
			break;
	}

	if (!redirectUrl) {
		return null;
	}

	return getGKDotDevLinkUrl(redirectUrl);
};
