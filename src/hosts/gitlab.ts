import type { InjectionProvider, LinkTarget } from '../provider';

declare const MODE: 'production' | 'development' | 'none';

export function injectionScope(url: string) {
	class GitLabInjectionProvider implements InjectionProvider {
		private _timer: ReturnType<typeof setTimeout> | undefined;
		private _observer: MutationObserver | undefined;

		constructor(private readonly uri: URL) {}

		inject(): void {
			this.render();
		}

		private render() {
			const insertions = this.getInsertions();
			this.insertHTML(insertions);
		}

		private getInsertions(): Map<string, { html: string; position: InsertPosition }> {
			const insertions = new Map<string, { html: string; position: InsertPosition }>();

			try {
				const label = 'Open with GitKraken';
				const url = this.transformUrl('gkdev', 'open');

				const { type, rest } = this.parseUrl(this.uri.pathname);

				switch (type) {
					case 'commit': {
						insertions.set('.page-content-header > .gl-button', {
							html: /*html*/ `<a data-gk class="gl-button btn btn-icon btn-md btn-default gl-mr-3 has-tooltip" href="${url}" target="_blank" title="${label}" aria-label="${label}">
	${this.getGitKrakenSvg(22, 's16 gl-icon gl-button-icon', undefined)}
</a>`,
							position: 'beforebegin',
						});

						break;
					}
					case 'compare': {
						if (rest.length) {
							// only insert if we know what we're comparing
							insertions.set('form.js-requires-input .gl-display-flex:last-child .btn-confirm', {
								html: /*html*/ `<a data-gk type="button" class="gl-button btn btn-defualt btn-md" href="${url}" target="_blank">
		<span class="gl-button-text">
			${this.getGitKrakenSvg(22, 's16 gl-icon gl-button-icon', undefined)}
			Compare with GitKraken
		</span>
	</a>`,
								position: 'afterend',
							});
						}

						break;
					}
					case 'merge_requests': {
						// quit early, since the `/merge_requests` endpoint w/o a MR number opens a list of merge requests. we
						// don't want our button there
						if (rest.length == 0) {
							break;
						}

						const compareUrl = this.transformUrl('gkdev', 'compare');

						const container = document.querySelector<HTMLElement>(
							'.merge-request .dropdown-menu .gl-dropdown-inner',
						);
						if (container) {
							container.style.maxHeight = '400px';
						}

						insertions.set('.merge-request .dropdown-menu .gl-dropdown-item:last-child', {
							html: /*html*/ `<li class="gl-dropdown-divider">
	<hr class="dropdown-divider">
</li>
<li class="gl-dropdown-section-header">
	<header class="dropdown-header">
		GitKraken
	</header>
</li>
<li data-gk class="gl-dropdown-item">
	<a class="dropdown-item" href="${url}" style="align-items: center !important;" target="_blank">
		<div class="gl-dropdown-item-text-wrapper" style="display: flex; align-items: center !important;">
			${this.getGitKrakenSvg(16, 'mr-2 gl-icon', 'flex: 0 0 auto;')}
			${label}
		</div>
	</a>
</li>
<li data-gk class="gl-dropdown-item">
	<a class="dropdown-item" href="${compareUrl}" style="align-items: center !important;" target="_blank">
		<div class="gl-dropdown-item-text-wrapper"" style="display: flex; align-items: center !important;">
			${this.getGitKrakenSvg(16, 'mr-2 gl-icon', 'flex: 0 0 auto;')}
			Open Comparison with GitKraken
		</div>
	</a>
</li>`,
							position: 'afterend',
						});

						break;
					}
					case 'tree':
					case undefined: {
						insertions.set(
							'.project-clone-holder .dropdown-menu .gl-dropdown-item:last-child .dropdown-item:last-child',
							{
								html: /*html*/ `<a data-gk class="dropdown-item open-with-link" href="${url}" style="align-items: center !important;" target="_blank">
	<div class="gl-dropdown-item-text-wrapper" style="display: flex; align-items: center !important;">
		${this.getGitKrakenSvg(16, 'mr-2 gl-icon', 'flex: 0 0 auto;')}
		<span>${label}</span>
	</div>
</a>`,
								position: 'afterend',
							},
						);

						break;
					}
				}
			} catch (ex) {
				debugger;
				console.error(ex);
			}
			return insertions;
		}

		private insertHTML(insertions: Map<string, { html: string; position: InsertPosition }>) {
			if (insertions.size) {
				for (const [selector, { html, position }] of insertions) {
					const el = document.querySelector(selector);
					if (el) {
						insertions.delete(selector);
						el.insertAdjacentHTML(position, html);
					}
				}

				if (!insertions.size) return;

				this._observer = new MutationObserver(() => {
					if (this._timer != null) {
						clearTimeout(this._timer);
					}

					this._timer = setTimeout(() => {
						for (const [selector, { html, position }] of insertions) {
							const el = document.querySelector(selector);
							if (el) {
								insertions.delete(selector);
								el.insertAdjacentHTML(position, html);
							}
						}

						if (!insertions.size) {
							this._observer?.disconnect();
							this._observer = undefined;
						}
					}, 100);
				});
				this._observer.observe(document.body, { childList: true, subtree: true });
			}
		}

		// TODO this does not support parsing of gitlab self-hosted relative URLs
		// https://docs.gitlab.com/ee/install/relative_url.html
		private parseUrl(url: string): {
			owner: string;
			subgroups: string[];
			repo: string;
			type: string | undefined;
			rest: string[];
		} {
			// remove slash at the end of the pathname
			const path = url.endsWith('/') ? url.substring(0, url.length - 1) : url;

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
		}

		private transformUrl(target: LinkTarget, action: 'open' | 'compare'): string {
			let { owner, repo, type, rest } = this.parseUrl(this.uri.pathname);

			if (target === 'gkdev') {
				const redirectUrl = new URL(this.transformUrl('vscode', action));
				console.debug('redirectUrl', redirectUrl);
				const deepLinkUrl =
					MODE === 'production' ? 'https://gitkraken.dev/link' : 'https://dev.gitkraken.dev/link';
				const deepLink = new URL(`${deepLinkUrl}/${encodeURIComponent(btoa(redirectUrl.toString()))}`);
				deepLink.searchParams.set('referrer', 'extension');
				if (redirectUrl.searchParams.get('pr')) {
					deepLink.searchParams.set('context', 'pr');
				}
				return deepLink.toString();
			}

			const repoId = '-';

			let url = new URL(MODE === 'production' ? 'https://gitkraken.dev' : 'https://dev.gitkraken.dev');
			switch (type) {
				case 'commit': {
					url = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/c/${rest.join('/')}`);
					break;
				}
				case 'compare': {
					// get the comparison target if not already provided
					let comparisonTarget = rest.join('/');
					if (!comparisonTarget) {
						// TODO get the current state of the comparison pickers
						// currently defaulting to a link to the repo
						url = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
						break;
					}
					const sameOrigin = !comparisonTarget.includes(':');
					if (sameOrigin) {
						const branches = comparisonTarget.split('...').map(branch => `origin/${branch}`);
						comparisonTarget = branches.join('...');
					}
					url = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/compare/${comparisonTarget}`);
					break;
				}
				case 'merge_requests': {
					const [prNumber] = rest;

					const headTreeUrl = document.querySelector<HTMLAnchorElement>(
						'.merge-request-details .detail-page-description a.gl-font-monospace:nth-of-type(2)',
					)?.href;
					if (headTreeUrl) {
						const {
							owner: prOwner,
							repo: prRepo,
							rest: prBranch,
						} = this.parseUrl(new URL(headTreeUrl).pathname);

						if (action === 'compare') {
							const baseTreeUrl = document.querySelector<HTMLAnchorElement>(
								'.merge-request-details .detail-page-description a.gl-font-monospace:nth-of-type(3)',
							)?.href;
							if (baseTreeUrl) {
								const {
									owner: baseOwner,
									repo: baseRepo,
									rest: baseBranch,
								} = this.parseUrl(new URL(baseTreeUrl).pathname);

								let baseBranchString = baseBranch.join('/');
								let prBranchString = prBranch.join('/');

								if (prOwner === baseOwner && prRepo === baseRepo) {
									baseBranchString = `origin/${baseBranchString}`;
									prBranchString = `origin/${prBranchString}`;
								}

								url = new URL(
									`${target}://eamodio.gitlens/link/r/${repoId}/compare/${baseBranchString}...${prBranchString}`,
								);
							}
						}

						if (url == null) {
							url = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/b/${prBranch.join('/')}`);
						}

						url.searchParams.set('pr', prNumber);
						url.searchParams.set('prUrl', this.uri.toString());

						if (prOwner !== owner || prRepo !== repo) {
							const prRepoUrl = new URL(this.uri.toString());
							prRepoUrl.hash = '';
							prRepoUrl.search = '';
							prRepoUrl.pathname = `/${owner}/${repo}.git`;
							url.searchParams.set('prRepoUrl', prRepoUrl.toString());

							owner = prOwner;
							repo = prRepo;
						}
					} else {
						url = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
						url.searchParams.set('pr', prNumber);
						url.searchParams.set('prUrl', this.uri.toString());
					}
					break;
				}
				case 'tree': {
					// TODO@miggy-e this is a pretty naive check, please update if you find a better way
					// this is currently broken when branches have 40 characters or if you use the short sha of a commit
					if (rest.length === 1 && rest[0].length === 40) {
						// commit sha's are 40 characters long
						url = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/c/${rest.join('/')}`);
					} else {
						url = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/b/${rest.join('/')}`);
					}
					break;
				}
				default: {
					url = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
					break;
				}
			}

			const remoteUrl = new URL(this.uri.toString());
			remoteUrl.hash = '';
			remoteUrl.search = '';
			remoteUrl.pathname = `/${owner}/${repo}.git`;

			url.searchParams.set('url', remoteUrl.toString());
			return url.toString();
		}

		private getGitKrakenSvg(size: number, classes?: string, style?: string) {
			return /*html*/ `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="${size}" height="${size}" fill="var(--color-btn-text)" viewBox="0 0 32 32"${
				classes ? ` class="${classes}"` : ''
			} style="pointer-events:none; ${style ?? ''}">
	<path d="M0 16C0 7.177 7.177 0 16 0s16 7.177 16 16-7.177 16-16 16S0 24.823 0 16Zm28.226-4.714a.607.607 0 0 0-.269-.317l-.004-.001c-.123-.07-.268-.095-.409-.07a.613.613 0 0 0-.5.6c.002.073.014.144.04.214.502 1.337.757 2.741.756 4.17a11.835 11.835 0 0 1-10.188 11.729v-5.396c.284-.058.566-.134.84-.226v4.67l.111-.027a11.128 11.128 0 0 0 6.042-3.864 10.939 10.939 0 0 0 2.406-6.884 11.052 11.052 0 0 0-5.703-9.685.618.618 0 0 0-.476-.046.61.61 0 0 0-.113 1.113 9.846 9.846 0 0 1-1.031 17.733v-3.954a1.666 1.666 0 0 0 1.104-1.387 1.67 1.67 0 0 0-.768-1.606c.237-2.17.927-2.598 1.433-2.913.302-.186.561-.348.561-.817v-.668c0-.692-.687-2.307-2.224-4.353-2.127-2.834-3.34-3.13-3.659-3.153-.12-.012-.223-.007-.337 0h-.012c-.321.023-1.534.32-3.664 3.153-1.539 2.046-2.227 3.661-2.227 4.353v.666c0 .47.26.63.56.817.506.313 1.197.742 1.433 2.912a1.664 1.664 0 0 0-.779 1.423c0 .692.456 1.33 1.117 1.572v3.955a9.837 9.837 0 0 1-4.364-3.51 9.784 9.784 0 0 1-1.752-5.604c0-3.578 1.95-6.88 5.088-8.62a.609.609 0 0 0-.294-1.14h-.001a.593.593 0 0 0-.29.076 11.057 11.057 0 0 0-5.71 9.684c0 2.53.833 4.91 2.407 6.885a11.131 11.131 0 0 0 6.041 3.864l.111.027v-4.669c.275.092.557.168.84.226v5.395A11.834 11.834 0 0 1 4.154 15.884c0-1.43.255-2.833.76-4.17a.612.612 0 0 0-.017-.464.597.597 0 0 0-.34-.316.611.611 0 0 0-.655.155.61.61 0 0 0-.125.202 13.133 13.133 0 0 0-.744 6.067A13.135 13.135 0 0 0 5.128 23.1a13.134 13.134 0 0 0 4.477 4.162 13.14 13.14 0 0 0 5.88 1.672l.093.003v-6.565a17.775 17.775 0 0 0 .479.012c.08-.002.233-.006.362-.012v6.565l.093-.003a13.156 13.156 0 0 0 5.878-1.676 13.152 13.152 0 0 0 4.477-4.163 13.145 13.145 0 0 0 2.097-5.741 13.146 13.146 0 0 0-.738-6.068ZM13.664 20.01a.977.977 0 0 0-.436-1.442.978.978 0 0 0-1.329.71.978.978 0 0 0 .583 1.09.974.974 0 0 0 1.183-.357h-.002Zm6.343-.994a.971.971 0 0 0-1.14-.475.978.978 0 0 0-.69 1.025.975.975 0 0 0 .968.881.974.974 0 0 0 .861-1.431h.001Z" />
</svg>`;
		}
	}

	const provider = new GitLabInjectionProvider(new URL(url));
	provider.inject();
}
