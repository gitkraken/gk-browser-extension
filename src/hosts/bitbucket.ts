// IMPORTANT: Non-type imports cannot be used, only anything contained within the injectionScope function will actually be injected into the page.

import type { InjectionProvider, LinkTarget } from '../provider';

interface ReplaceSelector {
	selector: string;
	href: string;
}

export function injectionScope(url: string, gkDotDevUrl: string) {
	class BitBucketInjectionProvider implements InjectionProvider {
		private _timer: ReturnType<typeof setTimeout> | undefined;
		private _observer: MutationObserver | undefined;

		constructor(private readonly uri: URL) {}

		inject(): void {
			this.render();
		}

		private render() {
			const insertions = this.getInsertions(this.uri.pathname);
			this.insertHTML(insertions);
			chrome.runtime.onMessage.addListener(request => {
				if (request.message === 'onHistoryStateUpdated') {
					setTimeout(
						() => {
							const newUri = new URL(request.details.url);
							const newInsertions = this.getInsertions(newUri.pathname);
							this.insertHTML(newInsertions);
						},
						request.details.url.includes('pull-requests') ? 1000 : 0,
					);
				}
			});
		}

		private getInsertions(pathname: string) {
			const insertions = new Map<
				string,
				{ html: string; position: InsertPosition; replaceSelectorList?: ReplaceSelector[] }
			>();
			try {
				const label = 'Open with GitKraken';
				const openUrl = this.transformUrl('open', pathname);

				const [, , , type] = pathname.split('/');
				switch (type) {
					case 'compare': {
						// TODO update the url when the dropdown changes/url changes
						const compareUrl = this.transformUrl('compare', pathname);
						insertions.set('#compare-toolbar .aui-buttons', {
							html: /*html*/ `<a data-gk class="aui-button gk-insert-compare" style="padding-top:0px !important; padding-bottom:0px !important;" href="${compareUrl}" target="_blank" title="${label}" aria-label="${label}">${this.getGitKrakenSvg(
								22,
								undefined,
								'position:relative; top:5px;',
							)}
							Open Comparison with GitKraken
							</a>`,
							position: 'afterbegin',
							replaceSelectorList: [{ selector: '.gk-insert-compare', href: compareUrl }],
						});
						break;
					}
					case 'pull-requests': {
						const compareUrl = this.transformUrl('compare', pathname);
						insertions.set(
							'[data-qa="page-header-wrapper"] [role="group"], .prCssVarContainer [role="group"]',
							{
								html: /*html*/ `<a data-gk class="gk-insert-pr css-w97uih" href="${openUrl}" target="_blank" title="${label}" role="menuitem" aria-label="${label}">${this.getGitKrakenSvg(
									20,
									undefined,
									'position:relative; top:4px; left:-5px;',
								)}Open with GitKraken</a>
							<a data-gk class="gk-insert-comparison css-w97uih" href="${compareUrl}" target="_blank" title="${label}" role="menuitem" aria-label="${label}">${this.getGitKrakenSvg(
								20,
								undefined,
								'position:relative; top:4px; left:-5px;',
							)}Open Comparison with GitKraken</a>`,
								position: 'afterbegin',
								replaceSelectorList: [
									{ selector: '.gk-insert-pr', href: openUrl },
									{ selector: '.gk-insert-comparison', href: compareUrl },
								],
							},
						);
						break;
					}
					case 'branches': {
						insertions.set('.css-1bvc4cc', {
							html: /*html*/ `<a data-gk class="css-w97uih" style="margin-right:4px !important;" href="${openUrl}" target="_blank" title="${label}" role="menuitem" aria-label="${label}">${this.getGitKrakenSvg(
								20,
								undefined,
								'position:relative; top:4px; left:-5px;',
							)}Open with GitKraken</a>`,
							position: 'afterbegin',
						});
						break;
					}
					case 'branch':
					case 'commits':
					case 'src':
					case undefined: {
						insertions.set('.css-1oy5iav', {
							html: /*html*/ `<a data-gk class="gk-insert css-w97uih" href="${openUrl}" target="_blank" title="${label}" role="menuitem" aria-label="${label}">${this.getGitKrakenSvg(
								20,
								undefined,
								'position:relative; top:4px; left:-5px;',
							)}Open with GitKraken</a>`,
							position: 'afterbegin',
							replaceSelectorList: [{ selector: '.gk-insert', href: openUrl }],
						});

						break;
					}
				}
			} catch (ex) {
				debugger;
				console.error(ex);
			}
			return insertions;
		}

		private insertHTML(
			insertions: Map<
				string,
				{ html: string; position: InsertPosition; replaceSelectorList?: ReplaceSelector[] }
			>,
		) {
			if (insertions.size) {
				for (const [selector, { html, position, replaceSelectorList }] of insertions) {
					if (replaceSelectorList?.length) {
						let found = false;
						for (const { selector: replaceSelector, href: replaceHref } of replaceSelectorList) {
							const el = document.querySelector<HTMLLinkElement>(replaceSelector);
							if (el) {
								insertions.delete(selector);
								el.href = replaceHref;
								found = true;
							}
						}
						if (found) continue;
					}
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
						for (const [selector, { html, position, replaceSelectorList }] of insertions) {
							if (replaceSelectorList?.length) {
								let found = false;
								for (const { selector: replaceSelector, href: replaceHref } of replaceSelectorList) {
									const el = document.querySelector<HTMLLinkElement>(replaceSelector);
									if (el) {
										insertions.delete(selector);
										el.href = replaceHref;
										found = true;
									}
								}
								if (found) continue;
							}
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
					}, 300);
				});
				this._observer.observe(document.body, { childList: true, subtree: true });
			}
		}

		private transformUrl(action: 'open' | 'compare', pathname: string): string {
			const redirectUrl = new URL(this.getRedirectUrl('vscode', action, pathname));
			const deepLinkUrl = `${gkDotDevUrl}/link`;
			const deepLink = new URL(`${deepLinkUrl}/${encodeURIComponent(btoa(redirectUrl.toString()))}`);
			deepLink.searchParams.set('referrer', 'extension');
			if (redirectUrl.searchParams.get('pr')) {
				deepLink.searchParams.set('context', 'pr');
			}
			return deepLink.toString();
		}

		private getRedirectUrl(target: LinkTarget, action: 'open' | 'compare', pathname: string): string {
			let [, owner, repo, type, ...rest] = pathname.split('/');
			if (rest?.length) {
				rest = rest.filter(Boolean);
			}

			const repoId = '-';

			let redirectUrl: URL | null = null;
			switch (type) {
				case 'commits': {
					const urlTarget = rest.join('/');
					if (!urlTarget) {
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
						break;
					}
					redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/c/${urlTarget}`);
					break;
				}
				case 'compare': {
					let comparisonTarget = rest.join('/');
					if (!comparisonTarget) {
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
						break;
					}
					const sameOrigin = !comparisonTarget.includes(':');
					if (sameOrigin) {
						const branches = comparisonTarget.split('%0D').map(branch => `${owner}/${repo}:${branch}`);

						comparisonTarget = branches.join('...');
					}
					redirectUrl = new URL(
						`${target}://eamodio.gitlens/link/r/${repoId}/compare/${comparisonTarget.replace(
							/%0D/g,
							'...',
						)}`,
					);
					break;
				}
				case 'pull-requests': {
					const [prNumber] = rest;
					const [prBranchElement, baseBranchElement, ..._] =
						document.querySelectorAll<HTMLAnchorElement>('.css-1ul4m4g.evx2nil0');
					const pr = prBranchElement?.innerText;
					const base = baseBranchElement?.innerText;

					if (pr && base) {
						const splitPr = pr.split('/');
						const splitBase = base.split('/');
						let prBranch;
						let prOwner;
						let prRepo;
						let baseOwner;
						let baseRepo;
						if (splitPr.length === 1) {
							prBranch = pr;
							prOwner = owner;
							prRepo = repo;
						} else {
							prOwner = splitPr[0];
							const splitPr2 = splitPr[1].split(':');
							prRepo = splitPr2[0];
							prBranch = splitPr2[1];
						}
						if (splitBase.length === 1) {
							baseOwner = owner;
							baseRepo = repo;
						} else {
							baseOwner = splitBase[0];
							const splitBase2 = splitBase[1].split(':');
							baseRepo = splitBase2[0];
						}

						if (action === 'compare') {
							let baseBranchString;
							let prBranchString;

							if (prOwner === baseOwner && prRepo === baseRepo) {
								const baseBranch = base;
								prBranch = pr;
								baseBranchString = `${baseOwner}/${baseRepo}:${baseBranch}`;
								prBranchString = `${prOwner}/${prRepo}:${prBranch}`;
							} else {
								baseBranchString = base;
								prBranchString = pr;
							}
							redirectUrl = new URL(
								`${target}://eamodio.gitlens/link/r/${repoId}/compare/${baseBranchString}...${prBranchString}`,
							);
						}

						if (redirectUrl === null) {
							redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/b/${prBranch}`);
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
					console.log('transform', redirectUrl.toString(), action);
					break;
				}
				case 'branches':
				case 'branch': {
					const urlTarget = rest.join('/');
					if (!urlTarget) {
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
						break;
					}
					redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/b/${urlTarget}`);
					break;
				}
				case 'src': {
					// TODO@miggy-e this is a pretty naive check, please update if you find a better way
					// this is currently broken when branches have 40 characters or if you use the short sha of a commit
					if (rest.length === 1 && rest[0].length === 40) {
						// commit sha's are 40 characters long
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/c/${rest.join('/')}`);
					} else if (!rest.length) {
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
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
			return /*html*/ `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="${size}" height="${size}" fill="var(--color-btn-text)" viewBox="0 0 32 32"${
				classes ? ` class="${classes}"` : ''
			} style="pointer-events:none; ${style ?? ''}">
	<path d="M0 16C0 7.177 7.177 0 16 0s16 7.177 16 16-7.177 16-16 16S0 24.823 0 16Zm28.226-4.714a.607.607 0 0 0-.269-.317l-.004-.001c-.123-.07-.268-.095-.409-.07a.613.613 0 0 0-.5.6c.002.073.014.144.04.214.502 1.337.757 2.741.756 4.17a11.835 11.835 0 0 1-10.188 11.729v-5.396c.284-.058.566-.134.84-.226v4.67l.111-.027a11.128 11.128 0 0 0 6.042-3.864 10.939 10.939 0 0 0 2.406-6.884 11.052 11.052 0 0 0-5.703-9.685.618.618 0 0 0-.476-.046.61.61 0 0 0-.113 1.113 9.846 9.846 0 0 1-1.031 17.733v-3.954a1.666 1.666 0 0 0 1.104-1.387 1.67 1.67 0 0 0-.768-1.606c.237-2.17.927-2.598 1.433-2.913.302-.186.561-.348.561-.817v-.668c0-.692-.687-2.307-2.224-4.353-2.127-2.834-3.34-3.13-3.659-3.153-.12-.012-.223-.007-.337 0h-.012c-.321.023-1.534.32-3.664 3.153-1.539 2.046-2.227 3.661-2.227 4.353v.666c0 .47.26.63.56.817.506.313 1.197.742 1.433 2.912a1.664 1.664 0 0 0-.779 1.423c0 .692.456 1.33 1.117 1.572v3.955a9.837 9.837 0 0 1-4.364-3.51 9.784 9.784 0 0 1-1.752-5.604c0-3.578 1.95-6.88 5.088-8.62a.609.609 0 0 0-.294-1.14h-.001a.593.593 0 0 0-.29.076 11.057 11.057 0 0 0-5.71 9.684c0 2.53.833 4.91 2.407 6.885a11.131 11.131 0 0 0 6.041 3.864l.111.027v-4.669c.275.092.557.168.84.226v5.395A11.834 11.834 0 0 1 4.154 15.884c0-1.43.255-2.833.76-4.17a.612.612 0 0 0-.017-.464.597.597 0 0 0-.34-.316.611.611 0 0 0-.655.155.61.61 0 0 0-.125.202 13.133 13.133 0 0 0-.744 6.067A13.135 13.135 0 0 0 5.128 23.1a13.134 13.134 0 0 0 4.477 4.162 13.14 13.14 0 0 0 5.88 1.672l.093.003v-6.565a17.775 17.775 0 0 0 .479.012c.08-.002.233-.006.362-.012v6.565l.093-.003a13.156 13.156 0 0 0 5.878-1.676 13.152 13.152 0 0 0 4.477-4.163 13.145 13.145 0 0 0 2.097-5.741 13.146 13.146 0 0 0-.738-6.068ZM13.664 20.01a.977.977 0 0 0-.436-1.442.978.978 0 0 0-1.329.71.978.978 0 0 0 .583 1.09.974.974 0 0 0 1.183-.357h-.002Zm6.343-.994a.971.971 0 0 0-1.14-.475.978.978 0 0 0-.69 1.025.975.975 0 0 0 .968.881.974.974 0 0 0 .861-1.431h.001Z" />
</svg>`;
		}
	}

	const provider = new BitBucketInjectionProvider(new URL(url));
	provider.inject();
}
