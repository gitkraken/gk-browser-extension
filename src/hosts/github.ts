// IMPORTANT: Non-type imports cannot be used, only anything contained within the injectionScope function will actually be injected into the page.

import type { InjectionProvider, LinkTarget } from '../provider';

export function injectionScope(url: string, gkDotDevUrl: string) {
	class GitHubInjectionProvider implements InjectionProvider {
		private _timer: ReturnType<typeof setTimeout> | undefined;
		private _observer: MutationObserver | undefined;
		private _domTimer: ReturnType<typeof setTimeout> | undefined;
		private _domObserver: MutationObserver | undefined;

		constructor(private uri: URL) {}

		inject(): void {
			document.addEventListener('pjax:end', () => {
				this.uri = new URL(window.location.href);
				this.render();
			});
			document.addEventListener('turbo:render', () => {
				this.uri = new URL(window.location.href);
				this.render();
			});

			this._domObserver = new MutationObserver((mutationRecord: MutationRecord[]) => {
				const portalchange = mutationRecord.find(
					e => e.target && (e.target as HTMLElement).id === '__primerPortalRoot__',
				);
				if (portalchange) {
					if (this._domTimer != null) {
						return;
					}

					this._domTimer = setTimeout(() => {
						this._domTimer = undefined;
						this.render();
					}, 100);
				}
			});
			this._domObserver.observe(document.body, { childList: true, subtree: true });

			this.render();
		}

		private render() {
			// Reset pending watchers
			if (this._timer != null) {
				clearTimeout(this._timer);
				this._timer = undefined;
			}
			if (this._observer != null) {
				this._observer.disconnect();
				this._observer = undefined;
			}

			// Remove all previous injected elements
			const els = document.querySelectorAll('[data-gk]');
			for (const el of els) {
				el.remove();
			}

			try {
				const insertions = this.getInsertions();
				this.insertHTML(insertions);
			} catch (ex) {
				debugger;
				console.error(ex);
			}
		}

		private getInsertions(): Map<string, { html: string; position: InsertPosition }> {
			const insertions = new Map<string, { html: string; position: InsertPosition }>();

			const label = 'Open with GitKraken';
			const openUrl = this.transformUrl('open');

			const [, , , type] = this.uri.pathname.split('/');
			switch (type) {
				case 'commit':
					// Insert button right before the "Browser files" button (Logged out version)
					insertions.set('#browse-at-time-link', {
						// This is inside a flexbox, so ml-auto adds a ballooning margin that pushes the element to the right
						html: /*html*/ `<a data-gk class="btn px-2 ml-auto flex-self-start" style="padding-top:2px !important; padding-bottom:1px !important;" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">${this.getGitKrakenSvg(
							22,
							undefined,
							'position:relative; top:2px;',
						)}</a>`,
						position: 'beforebegin',
					});

					// Insert button right before the "Browser files" button (Logged in version)
					insertions.set('[aria-label="Browse the repository at this point in the history"]', {
						// This is inside a flexbox, so ml-auto adds a ballooning margin that pushes the element to the right
						html: /*html*/ `<a data-gk class="btn px-2 ml-auto flex-self-start" style="padding-top:2px !important; padding-bottom:1px !important;" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">${this.getGitKrakenSvg(
							22,
							undefined,
							'position:relative; top:2px;',
						)}</a>`,
						position: 'beforebegin',
					});

					// For GitHub Enterprise 3.11.2
					insertions.set('.commit > #browse-at-time-link', {
						html: /*html*/ `<a data-gk class="btn mr-2 px-2 float-right" style="padding-top:2px !important; padding-bottom:1px !important;" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">${this.getGitKrakenSvg(
							22,
							undefined,
							'position:relative; top:2px;',
						)}</a>`,
						position: 'afterend',
					});

					break;
				case 'compare':
					insertions.set('.js-range-editor', {
						html: /*html*/ `<a data-gk class="btn mr-2 px-2 float-right" style="padding-top:2px !important; padding-bottom:1px !important;" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">${this.getGitKrakenSvg(
							22,
							undefined,
							'position:relative; top:2px;',
						)}</a>`,
						position: 'afterbegin',
					});

					break;
				case 'pull': {
					const compareUrl = this.transformUrl('compare');

					insertions.set('[data-target="get-repo.modal"] #local-panel ul li:first-child', {
						html: /*html*/ `<li data-gk class="Box-row Box-row--hover-gray p-3 mt-0 rounded-0">
	<a class="d-flex flex-items-center color-fg-default text-bold no-underline" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">
		${this.getGitKrakenSvg(16, 'mr-2')}
		${label}
	</a>
</li>
<li data-gk class="Box-row Box-row--hover-gray p-3 mt-0 rounded-0">
	<a class="d-flex flex-items-center color-fg-default text-bold no-underline" href="${compareUrl}" target="_blank" title="Open Comparison with GitKraken" aria-label="Open Comparison with GitKraken">
		${this.getGitKrakenSvg(16, 'mr-2')}
		Open Comparison with GitKraken
	</a>
</li>`,
						position: 'afterend',
					});

					insertions.set('#__primerPortalRoot__ > div > div > div > ul > div > ul > li:first-child', {
						html: /*html*/ `<li data-gk class="Box-row Box-row--hover-gray p-3 mt-0 rounded-0">
	<a class="d-flex flex-items-center color-fg-default text-bold no-underline" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">
		${this.getGitKrakenSvg(16, 'mr-2')}
		${label}
	</a>
</li>
<li data-gk class="Box-row Box-row--hover-gray p-3 mt-0 rounded-0">
	<a class="d-flex flex-items-center color-fg-default text-bold no-underline" href="${compareUrl}" target="_blank" title="Open Comparison with GitKraken" aria-label="Open Comparison with GitKraken">
		${this.getGitKrakenSvg(16, 'mr-2')}
		Open Comparison with GitKraken
	</a>
</li>`,
						position: 'afterend',
					});

					break;
				}
				case 'tree':
				case undefined:
					// Enterpise v3.11.2
					insertions.set('[data-target="get-repo.modal"] ul li:last-child', {
						html: /*html*/ `<li data-gk class="Box-row Box-row--hover-gray p-3 mt-0 rounded-0">
	<a class="d-flex flex-items-center color-fg-default text-bold no-underline" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">
		${this.getGitKrakenSvg(16, 'mr-2')}
		${label}
	</a>
</li>`,
						position: 'afterend',
					});

					insertions.set('[data-target="get-repo.modal"] #local-panel ul li:first-child', {
						html: /*html*/ `<li data-gk class="Box-row Box-row--hover-gray p-3 mt-0 rounded-0">
	<a class="d-flex flex-items-center color-fg-default text-bold no-underline" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">
		${this.getGitKrakenSvg(16, 'mr-2')}
		${label}
	</a>
</li>`,
						position: 'afterend',
					});

					// Insert button inside the "Code" modal
					insertions.set(
						'#__primerPortalRoot__ .react-overview-code-button-action-list > div > ul > li:first-child',
						{
							html: /*html*/ `<li data-gk style="margin-inline: var(--base-size-8, .5rem);">
	<a class="d-flex flex-items-center color-fg-default text-bold no-underline" style="padding-block: var(--control-medium-paddingBlock, .375rem); padding-inline: var(--control-medium-paddingInline-condensed, .5rem);" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">
		${this.getGitKrakenSvg(16, 'mr-2')}
		${label}
	</a>
</li>`,
							position: 'beforebegin',
						},
					);

					break;
				default: {
					insertions.set('.file-navigation get-repo', {
						html: /*html*/ `<a data-gk class="btn mr-2 px-2 py-0" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">${this.getGitKrakenSvg(
							22,
							undefined,
							'position:relative; top:2px;',
						)}</a>`,
						position: 'beforebegin',
					});
					insertions.set('[data-target="get-repo.modal"] #local-panel ul li:first-child', {
						html: /*html*/ `<li data-gk class="Box-row Box-row--hover-gray p-3 mt-0 rounded-0">
	<a class="d-flex flex-items-center color-fg-default text-bold no-underline" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">
		${this.getGitKrakenSvg(16, 'mr-2')}
		${label}
	</a>
</li>`,
						position: 'afterend',
					});

					insertions.set('#__primerPortalRoot__ > div > div > div > ul > div > ul > li:first-child', {
						html: /*html*/ `<li data-gk class="Box-row Box-row--hover-gray p-3 mt-0 rounded-0">
	<a class="d-flex flex-items-center color-fg-default text-bold no-underline" href="${openUrl}" target="_blank" title="${label}" aria-label="${label}">
		${this.getGitKrakenSvg(16, 'mr-2')}
		${label}
	</a>
</li>`,
						position: 'afterend',
					});

					break;
				}
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

		private transformUrl(action: 'open' | 'compare'): string {
			const redirectUrl = new URL(this.getRedirectUrl('vscode', action));
			console.debug('redirectUrl', redirectUrl);
			const deepLinkUrl = `${gkDotDevUrl}/link`;
			const deepLink = new URL(`${deepLinkUrl}/${encodeURIComponent(btoa(redirectUrl.toString()))}`);
			deepLink.searchParams.set('referrer', 'extension');
			if (redirectUrl.searchParams.get('pr')) {
				deepLink.searchParams.set('context', 'pr');
			}
			return deepLink.toString();
		}

		private getRedirectUrl(target: LinkTarget, action: 'open' | 'compare'): string {
			let [, owner, repo, type, ...rest] = this.uri.pathname.split('/');
			if (rest?.length) {
				rest = rest.filter(Boolean);
			}

			const repoId = '-';

			let redirectUrl: URL | null = null;
			switch (type) {
				case 'commit':
					redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/c/${rest.join('/')}`);
					break;
				case 'compare': {
					let comparisonTarget = rest.join('/');
					if (!comparisonTarget) {
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
						break;
					}
					const sameOrigin = !comparisonTarget.includes(':');
					if (sameOrigin) {
						const branches = comparisonTarget.split('...').map(branch => `${owner}/${repo}:${branch}`);
						comparisonTarget = branches.join('...');
					}
					redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/compare/${comparisonTarget}`);
					break;
				}
				case 'pull': {
					const [prNumber] = rest;

					const headTreeUrl = document.querySelector<HTMLAnchorElement>('.commit-ref.head-ref a')?.href;
					if (headTreeUrl) {
						const [, prOwner, prRepo, , ...prBranch] = new URL(headTreeUrl).pathname.split('/');

						if (action === 'compare') {
							const baseTreeUrl =
								document.querySelector<HTMLAnchorElement>('.commit-ref.base-ref a')?.href;
							if (baseTreeUrl) {
								const [, baseOwner, baseRepo, , ...baseBranch] = new URL(baseTreeUrl).pathname.split(
									'/',
								);

								const baseBranchString = `${baseOwner}/${baseRepo}:${baseBranch.join('/')}`;
								const prBranchString = `${prOwner}/${prRepo}:${prBranch.join('/')}`;

								redirectUrl = new URL(
									`${target}://eamodio.gitlens/link/r/${repoId}/compare/${baseBranchString}...${prBranchString}`,
								);
							}
						}

						if (redirectUrl === null) {
							redirectUrl = new URL(
								`${target}://eamodio.gitlens/link/r/${repoId}/b/${prBranch.join('/')}`,
							);
						}

						redirectUrl.searchParams.set('pr', prNumber);
						redirectUrl.searchParams.set('prUrl', this.uri.toString());

						if (prOwner !== owner || prRepo !== repo) {
							const prRepoUrl = new URL(this.uri.toString());
							prRepoUrl.hash = '';
							prRepoUrl.search = '';
							prRepoUrl.pathname = `/${owner}/${repo}.git`;
							redirectUrl.searchParams.set('prRepoUrl', prRepoUrl.toString());

							owner = prOwner;
							repo = prRepo;
						}
					} else {
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
						redirectUrl.searchParams.set('pr', prNumber);
						redirectUrl.searchParams.set('prUrl', this.uri.toString());
					}
					break;
				}
				case 'tree': {
					// TODO@miggy-e this is a pretty naive check, please update if you find a better way
					// this is currently broken when branches have 40 characters or if you use the short sha of a commit
					if (rest.length === 1 && rest[0].length === 40) {
						// commit sha's are 40 characters long
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/c/${rest.join('/')}`);
					} else {
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/b/${rest.join('/')}`);
					}
					break;
				}
				default:
					redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
					break;
			}

			const remoteUrl = new URL(this.uri.toString());
			remoteUrl.hash = '';
			remoteUrl.search = '';
			remoteUrl.pathname = `/${owner}/${repo}.git`;

			redirectUrl.searchParams.set('url', remoteUrl.toString());
			return redirectUrl.toString();
		}

		private getGitKrakenSvg(size: number, classes?: string, style?: string) {
			return /*html*/ `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="${size}" height="${size}" fill="currentColor" viewBox="0 0 32 32"${
				classes ? ` class="${classes}"` : ''
			} style="pointer-events:none; ${style ?? ''}">
	<path d="M0 16C0 7.177 7.177 0 16 0s16 7.177 16 16-7.177 16-16 16S0 24.823 0 16Zm28.226-4.714a.607.607 0 0 0-.269-.317l-.004-.001c-.123-.07-.268-.095-.409-.07a.613.613 0 0 0-.5.6c.002.073.014.144.04.214.502 1.337.757 2.741.756 4.17a11.835 11.835 0 0 1-10.188 11.729v-5.396c.284-.058.566-.134.84-.226v4.67l.111-.027a11.128 11.128 0 0 0 6.042-3.864 10.939 10.939 0 0 0 2.406-6.884 11.052 11.052 0 0 0-5.703-9.685.618.618 0 0 0-.476-.046.61.61 0 0 0-.113 1.113 9.846 9.846 0 0 1-1.031 17.733v-3.954a1.666 1.666 0 0 0 1.104-1.387 1.67 1.67 0 0 0-.768-1.606c.237-2.17.927-2.598 1.433-2.913.302-.186.561-.348.561-.817v-.668c0-.692-.687-2.307-2.224-4.353-2.127-2.834-3.34-3.13-3.659-3.153-.12-.012-.223-.007-.337 0h-.012c-.321.023-1.534.32-3.664 3.153-1.539 2.046-2.227 3.661-2.227 4.353v.666c0 .47.26.63.56.817.506.313 1.197.742 1.433 2.912a1.664 1.664 0 0 0-.779 1.423c0 .692.456 1.33 1.117 1.572v3.955a9.837 9.837 0 0 1-4.364-3.51 9.784 9.784 0 0 1-1.752-5.604c0-3.578 1.95-6.88 5.088-8.62a.609.609 0 0 0-.294-1.14h-.001a.593.593 0 0 0-.29.076 11.057 11.057 0 0 0-5.71 9.684c0 2.53.833 4.91 2.407 6.885a11.131 11.131 0 0 0 6.041 3.864l.111.027v-4.669c.275.092.557.168.84.226v5.395A11.834 11.834 0 0 1 4.154 15.884c0-1.43.255-2.833.76-4.17a.612.612 0 0 0-.017-.464.597.597 0 0 0-.34-.316.611.611 0 0 0-.655.155.61.61 0 0 0-.125.202 13.133 13.133 0 0 0-.744 6.067A13.135 13.135 0 0 0 5.128 23.1a13.134 13.134 0 0 0 4.477 4.162 13.14 13.14 0 0 0 5.88 1.672l.093.003v-6.565a17.775 17.775 0 0 0 .479.012c.08-.002.233-.006.362-.012v6.565l.093-.003a13.156 13.156 0 0 0 5.878-1.676 13.152 13.152 0 0 0 4.477-4.163 13.145 13.145 0 0 0 2.097-5.741 13.146 13.146 0 0 0-.738-6.068ZM13.664 20.01a.977.977 0 0 0-.436-1.442.978.978 0 0 0-1.329.71.978.978 0 0 0 .583 1.09.974.974 0 0 0 1.183-.357h-.002Zm6.343-.994a.971.971 0 0 0-1.14-.475.978.978 0 0 0-.69 1.025.975.975 0 0 0 .968.881.974.974 0 0 0 .861-1.431h.001Z" />
</svg>`;
		}
	}

	const provider = new GitHubInjectionProvider(new URL(url));
	provider.inject();
}
