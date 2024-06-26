// IMPORTANT: Non-type imports cannot be used, only anything contained within the injectionScope function will actually be injected into the page.

import type { InjectionProvider, LinkTarget } from '../provider';

interface ReplaceSelector {
	selector: string;
	href: string;
}

export function injectionScope(url: string, gkDotDevUrl: string) {
	class AzureDevopsInjectionProvider implements InjectionProvider {
		private _timer: ReturnType<typeof setTimeout> | undefined;
		private _observer: MutationObserver | undefined;

		constructor(private readonly uri: URL) {}

		inject(): void {
			this.render();
		}

		private render() {
			const insertions = this.getInsertions(this.uri.pathname, this.uri.searchParams);
			this.insertHTML(insertions);
			chrome.runtime.onMessage.addListener(request => {
				if (request.message === 'onHistoryStateUpdated') {
					setTimeout(
						() => {
							const newUri = new URL(request.details.url);
							const newInsertions = this.getInsertions(newUri.pathname, newUri.searchParams);
							this.insertHTML(newInsertions);
						},
						request.details.url.includes('pullrequest') ? 300 : 0,
					);
				}
			});
		}

		private getInsertions(pathname: string, search: URLSearchParams) {
			const insertions = new Map<
				string,
				{ html: string; position: InsertPosition; replaceSelectorList?: ReplaceSelector[] }
			>();
			try {
				const label = 'Open with GitKraken';
				const openUrl = this.transformUrl('open', pathname, search);

				const [, , , , , type] = pathname.split('/');
				switch (type) {
					case 'branchCompare': {
						const compareUrl = this.transformUrl('compare', pathname, search);
						insertions.set('.bolt-header-commandbar-button-group', {
							html: /*html*/ `<a data-gk class="gk-insert-commit bolt-header-command-item-button bolt-button" href="${compareUrl}" style="text-decoration:none !important" target="_blank" title="${label}" role="menuitem" aria-label="${label}">${this.getGitKrakenSvg(
								20,
								undefined,
								'position:relative; margin-right:4px;',
							)}Open Comparison with GitKraken</a>`,
							position: 'afterbegin',
							replaceSelectorList: [{ selector: '.gk-insert-compare', href: compareUrl }],
						});
						break;
					}
					case 'pullrequest': {
						const compareUrl = this.transformUrl('compare', pathname, search);
						insertions.set('.repos-pr-title-row', {
							html: /*html*/ `<a data-gk class="gk-insert-pr bolt-header-command-item-button bolt-button" href="${openUrl}" style="text-decoration:none !important" target="_blank" title="${label}" role="menuitem" aria-label="${label}">${this.getGitKrakenSvg(
								20,
								undefined,
								'position:relative; margin-right:4px;',
							)}Open with GitKraken</a>
							<a data-gk class="gk-insert-compare bolt-header-command-item-button bolt-button" href="${compareUrl}" style="text-decoration:none !important" target="_blank" title="${label}" role="menuitem" aria-label="${label}">${this.getGitKrakenSvg(
								20,
								undefined,
								'position:relative; margin-right:4px;',
							)}Open Comparison with GitKraken</a>`,
							position: 'afterend',
							replaceSelectorList: [
								{ selector: '.gk-insert-compare', href: compareUrl },
								{ selector: '.gk-insert-pr', href: openUrl },
							],
						});
						break;
					}
					case 'commit': {
						insertions.set('.bolt-header-commandbar ', {
							html: /*html*/ `<a data-gk class="gk-insert-commit bolt-header-command-item-button bolt-button" href="${openUrl}" style="text-decoration:none !important" target="_blank" title="${label}" role="menuitem" aria-label="${label}">${this.getGitKrakenSvg(
								20,
								undefined,
								'position:relative; margin-right:4px;',
							)}Open with GitKraken</a>`,
							position: 'afterbegin',
							replaceSelectorList: [{ selector: '.gk-insert-commit', href: openUrl }],
						});

						break;
					}
					case undefined: {
						insertions.set('.repos-files-header-commandbar ', {
							html: /*html*/ `<a data-gk class="gk-insert bolt-header-command-item-button bolt-button" href="${openUrl}" style="text-decoration:none !important" target="_blank" title="${label}" role="menuitem" aria-label="${label}">${this.getGitKrakenSvg(
								20,
								undefined,
								'position:relative; margin-right:4px;',
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

		private transformUrl(action: 'open' | 'compare', pathname: string, search: URLSearchParams): string {
			const redirectUrl = new URL(this.getRedirectUrl('vscode', action, pathname, search));
			const deepLinkUrl = `${gkDotDevUrl}/link`;
			const deepLink = new URL(`${deepLinkUrl}/${encodeURIComponent(btoa(redirectUrl.toString()))}`);
			deepLink.searchParams.set('referrer', 'extension');
			if (redirectUrl.searchParams.get('pr')) {
				deepLink.searchParams.set('context', 'pr');
			}
			return deepLink.toString();
		}

		private getRedirectUrl(
			target: LinkTarget,
			action: 'open' | 'compare',
			pathname: string,
			search: URLSearchParams,
		): string {
			let { org, project, repo, type, urlTarget } = this.parsePathname(pathname);

			const repoId = '-';

			let redirectUrl: URL | null = null;
			switch (type) {
				case 'commit': {
					redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/c/${urlTarget}`);
					break;
				}
				case 'branchCompare': {
					// no comparisons across forks
					const comparisonTargetBranch = search.get('targetVersion')?.slice(2);
					const comparisonBaseBranch = search.get('baseVersion')?.slice(2);
					if (!comparisonTargetBranch || !comparisonBaseBranch) {
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
						break;
					}
					redirectUrl = new URL(
						`${target}://eamodio.gitlens/link/r/${repoId}/compare/${org}/${project}/${repo}:${comparisonBaseBranch}...${org}/${project}/${repo}:${comparisonTargetBranch}`,
					);
					break;
				}
				case 'pullrequest': {
					const prNumber = urlTarget;
					const [prBranchElement, baseBranchElement, ..._] = document.querySelectorAll<HTMLAnchorElement>(
						'.pr-header-branches > .bolt-link',
					);
					const pr = prBranchElement?.href;
					const base = baseBranchElement?.href;

					if (pr && base) {
						const prUrl = new URL(pr);
						const splitPr = prUrl.pathname.split('/');
						const baseUrl = new URL(base);
						const splitBase = baseUrl.pathname.split('/');
						const [, prOrg, prProject, , prRepo] = splitPr;
						const [, baseOrg, baseProject, , baseRepo] = splitBase;
						const prBranch = prUrl.searchParams.get('version')?.slice(2);
						const baseBranch = baseUrl.searchParams.get('version')?.slice(2);

						if (action === 'compare') {
							const baseBranchString = `${baseOrg}/${baseProject}/${baseRepo}:${baseBranch}`;
							const prBranchString = `${prOrg}/${prProject}/${prRepo}:${prBranch}`;

							redirectUrl = new URL(
								`${target}://eamodio.gitlens/link/r/${repoId}/compare/${baseBranchString}...${prBranchString}`,
							);
						}

						if (redirectUrl === null) {
							redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/b/${prBranch}`);
						}

						redirectUrl.searchParams.set('pr', prNumber);
						redirectUrl.searchParams.set('prUrl', this.uri.toString());

						if (prOrg !== org || prRepo !== repo) {
							const prRepoUrl = `https://${prOrg}@dev.azure.com/${prOrg}/${prProject}/_git/${prRepo}`;
							redirectUrl.searchParams.set('prRepoUrl', prRepoUrl.toString());

							org = prOrg;
							repo = prRepo;
						}
					} else {
						redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}`);
						redirectUrl.searchParams.set('pr', prNumber);
						redirectUrl.searchParams.set('prUrl', this.uri.toString());
					}
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
			console.log('remoteUrl', remoteUrl);

			redirectUrl.searchParams.set('url', remoteUrl.toString());
			return redirectUrl.toString();
		}

		private parsePathname(pathname: string): {
			org: string;
			project: string;
			repo: string;
			type: string | undefined;
			urlTarget: string;
		} {
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
		}

		private getGitKrakenSvg(size: number, classes?: string, style?: string) {
			return /*html*/ `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="${size}" height="${size}" fill="var(--color-btn-text)" viewBox="0 0 32 32"${
				classes ? ` class="${classes}"` : ''
			} style="pointer-events:none; ${style ?? ''}">
	<path d="M0 16C0 7.177 7.177 0 16 0s16 7.177 16 16-7.177 16-16 16S0 24.823 0 16Zm28.226-4.714a.607.607 0 0 0-.269-.317l-.004-.001c-.123-.07-.268-.095-.409-.07a.613.613 0 0 0-.5.6c.002.073.014.144.04.214.502 1.337.757 2.741.756 4.17a11.835 11.835 0 0 1-10.188 11.729v-5.396c.284-.058.566-.134.84-.226v4.67l.111-.027a11.128 11.128 0 0 0 6.042-3.864 10.939 10.939 0 0 0 2.406-6.884 11.052 11.052 0 0 0-5.703-9.685.618.618 0 0 0-.476-.046.61.61 0 0 0-.113 1.113 9.846 9.846 0 0 1-1.031 17.733v-3.954a1.666 1.666 0 0 0 1.104-1.387 1.67 1.67 0 0 0-.768-1.606c.237-2.17.927-2.598 1.433-2.913.302-.186.561-.348.561-.817v-.668c0-.692-.687-2.307-2.224-4.353-2.127-2.834-3.34-3.13-3.659-3.153-.12-.012-.223-.007-.337 0h-.012c-.321.023-1.534.32-3.664 3.153-1.539 2.046-2.227 3.661-2.227 4.353v.666c0 .47.26.63.56.817.506.313 1.197.742 1.433 2.912a1.664 1.664 0 0 0-.779 1.423c0 .692.456 1.33 1.117 1.572v3.955a9.837 9.837 0 0 1-4.364-3.51 9.784 9.784 0 0 1-1.752-5.604c0-3.578 1.95-6.88 5.088-8.62a.609.609 0 0 0-.294-1.14h-.001a.593.593 0 0 0-.29.076 11.057 11.057 0 0 0-5.71 9.684c0 2.53.833 4.91 2.407 6.885a11.131 11.131 0 0 0 6.041 3.864l.111.027v-4.669c.275.092.557.168.84.226v5.395A11.834 11.834 0 0 1 4.154 15.884c0-1.43.255-2.833.76-4.17a.612.612 0 0 0-.017-.464.597.597 0 0 0-.34-.316.611.611 0 0 0-.655.155.61.61 0 0 0-.125.202 13.133 13.133 0 0 0-.744 6.067A13.135 13.135 0 0 0 5.128 23.1a13.134 13.134 0 0 0 4.477 4.162 13.14 13.14 0 0 0 5.88 1.672l.093.003v-6.565a17.775 17.775 0 0 0 .479.012c.08-.002.233-.006.362-.012v6.565l.093-.003a13.156 13.156 0 0 0 5.878-1.676 13.152 13.152 0 0 0 4.477-4.163 13.145 13.145 0 0 0 2.097-5.741 13.146 13.146 0 0 0-.738-6.068ZM13.664 20.01a.977.977 0 0 0-.436-1.442.978.978 0 0 0-1.329.71.978.978 0 0 0 .583 1.09.974.974 0 0 0 1.183-.357h-.002Zm6.343-.994a.971.971 0 0 0-1.14-.475.978.978 0 0 0-.69 1.025.975.975 0 0 0 .968.881.974.974 0 0 0 .861-1.431h.001Z" />
</svg>`;
		}
	}

	const provider = new AzureDevopsInjectionProvider(new URL(url));
	provider.inject();
}
