// IMPORTANT: Non-type imports cannot be used, only anything contained within the injectionScope function will actually be injected into the page.

import type { InjectionProvider, LinkTarget } from '../provider';

export function injectionScope(url: string, gkDotDevUrl: string) {
	class GitHubInjectionProvider implements InjectionProvider {
		private _timer: ReturnType<typeof setTimeout> | undefined;
		private _observer: MutationObserver | undefined;
		private readonly _onNavigation = () => this.schedule();
		private readonly _onMessage = (request: { message?: string; details?: { frameId?: number; url?: string } }) => {
			if (request.message === 'onHistoryStateUpdated' && (request.details?.frameId ?? 0) === 0) {
				this.schedule();
			}
		};

		constructor(private uri: URL) {}

		inject(): void {
			const hostWindow = window as Window & { __gkGithubInjection?: GitHubInjectionProvider };
			hostWindow.__gkGithubInjection?.dispose();
			hostWindow.__gkGithubInjection = this;
			this.ensureStyles();

			document.addEventListener('pjax:end', this._onNavigation);
			document.addEventListener('turbo:render', this._onNavigation);
			window.addEventListener('popstate', this._onNavigation);
			chrome.runtime.onMessage.addListener(this._onMessage);
			const isGkOwned = (node: Node) =>
				node.nodeType === Node.ELEMENT_NODE && (node as Element).closest('[data-gk-owner="github"]') != null;
			this._observer = new MutationObserver(records => {
				const hostChanged = records.some(record => {
					if ((record.target as Element).closest?.('[data-gk-owner="github"]')) return false;
					if (record.type === 'attributes') return true;
					// Insertions and relocations of our own nodes are not host changes. A bare removal still is, since the host may have dropped them
					return !(
						record.addedNodes.length > 0 && [...record.addedNodes, ...record.removedNodes].every(isGkOwned)
					);
				});
				if (hostChanged) this.schedule();
			});
			this._observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['aria-expanded', 'hidden', 'href'],
				childList: true,
				subtree: true,
			});
			this.reconcile();
		}

		dispose(): void {
			if (this._timer != null) clearTimeout(this._timer);
			this._observer?.disconnect();
			document.removeEventListener('pjax:end', this._onNavigation);
			document.removeEventListener('turbo:render', this._onNavigation);
			window.removeEventListener('popstate', this._onNavigation);
			chrome.runtime.onMessage.removeListener(this._onMessage);
			document.querySelector('[data-gk-style="github-actions"]')?.remove();
			const hostWindow = window as Window & { __gkGithubInjection?: GitHubInjectionProvider };
			if (hostWindow.__gkGithubInjection === this) delete hostWindow.__gkGithubInjection;
		}

		private ensureStyles(): void {
			if (document.querySelector('[data-gk-style="github-actions"]')) return;
			const style = document.createElement('style');
			style.dataset.gkStyle = 'github-actions';
			style.textContent = `
				.gk-github-menu-link:hover { background-color: var(--control-transparent-bgColor-hover, rgba(177, 186, 196, .12)); text-decoration: none; }
				.gk-github-menu-link:focus-visible, .gk-github-inline-action:focus-visible { outline: 2px solid var(--focus-outlineColor, #4493f8); outline-offset: -2px; }
				.gk-github-inline-action:hover { background-color: var(--button-default-bgColor-hover, rgba(177, 186, 196, .12)); text-decoration: none; }
			`;
			document.head.append(style);
		}

		private schedule(): void {
			if (this._timer != null) clearTimeout(this._timer);
			this._timer = setTimeout(() => {
				this._timer = undefined;
				this.reconcile();
			}, 100);
		}

		private reconcile(): void {
			this.uri = new URL(window.location.href);
			const route = this.getRepositoryRoute();
			const desiredSlots = new Set<string>();
			if (route) {
				const { owner, repo, type } = route;
				if (type === 'commit') {
					const action = this.getCommitActionTarget(owner, repo);
					if (action) {
						desiredSlots.add('github-commit');
						this.upsertAction(
							action,
							'github-commit',
							'open',
							'Open with GitKraken',
							this.transformUrl('open'),
						);
					}
				} else if (type === 'compare') {
					const rangeEditor = document.querySelector<HTMLElement>('.js-range-editor');
					if (rangeEditor) {
						desiredSlots.add('github-compare');
						this.upsertAction(
							{ element: rangeEditor, position: 'afterbegin', list: false },
							'github-compare',
							'open',
							'Open with GitKraken',
							this.transformUrl('open'),
						);
					}
				} else if (type === 'pull') {
					const list = this.getPullRequestActionList(owner, repo);
					if (list) {
						const openUrl = this.transformUrl('open');
						desiredSlots.add('github-pull-open');
						desiredSlots.add('github-pull-compare');
						this.upsertAction(list, 'github-pull-open', 'open', 'Open with GitKraken', openUrl);
						this.upsertAction(
							list,
							'github-pull-compare',
							'compare',
							'Open Comparison with GitKraken',
							this.transformUrl('compare'),
						);
					}
				} else if (type === undefined || type === 'tree') {
					const list = this.getRepositoryActionList(owner, repo);
					if (list) {
						desiredSlots.add('github-repository-code');
						this.upsertAction(
							list,
							'github-repository-code',
							'open',
							'Open with GitKraken',
							this.transformUrl('open'),
						);
					}
				}
			}

			for (const element of document.querySelectorAll<HTMLElement>('[data-gk-owner="github"]')) {
				if (!desiredSlots.has(element.dataset.gkSlot ?? '')) element.remove();
			}
		}

		private getRepositoryRoute(): { owner: string; repo: string; type?: string } | undefined {
			const segments = this.uri.pathname.split('/').filter(Boolean);
			const [owner, repo, type] = segments;
			const reserved = new Set([
				'account',
				'apps',
				'collections',
				'enterprise',
				'events',
				'explore',
				'features',
				'issues',
				'login',
				'logout',
				'marketplace',
				'new',
				'notifications',
				'orgs',
				'organizations',
				'pulls',
				'search',
				'settings',
				'sponsors',
				'starred',
				'topics',
				'users',
			]);
			if (!owner || !repo || reserved.has(owner.toLowerCase())) return undefined;

			// GitHub serves any casing of a repository path, but its header links always use the canonical casing
			const repoPath = `/${owner}/${repo}`.toLowerCase();
			const evidenceLinks = document.querySelectorAll<HTMLAnchorElement>(
				'a[data-testid="repo-name-link"], a[data-component="Breadcrumbs.Item"], a#code-view-repo-link, a[data-tab-item="code"], a#code-tab, strong[itemprop="name"] a',
			);
			for (const link of evidenceLinks) {
				const href = link.getAttribute('href');
				if (!href || href.toLowerCase() !== repoPath) continue;

				const [canonicalOwner, canonicalRepo] = href.split('/').filter(Boolean);
				return { owner: canonicalOwner, repo: canonicalRepo, type: type };
			}
			return undefined;
		}

		private getRepositoryActionList(owner: string, repo: string): HTMLElement | undefined {
			const repoArchive = `/${owner}/${repo}/archive/`.toLowerCase();
			const isRepoArchive = (link: HTMLAnchorElement) =>
				(link.getAttribute('href') ?? '').toLowerCase().startsWith(repoArchive);
			const actionList = [...document.querySelectorAll<HTMLElement>('ul[aria-label="Repository actions"]')].find(
				list => [...list.querySelectorAll<HTMLAnchorElement>('a[href]')].some(isRepoArchive),
			);
			if (actionList) return actionList;

			// Only trust archive links that live in the Code menu; other pages list archives too (e.g. release assets)
			const archiveList = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/archive/"]')]
				.filter(isRepoArchive)
				.map(link => link.closest<HTMLElement>('ul'))
				.find(
					list =>
						list != null &&
						(list.matches('[data-component="ActionList"]') ||
							list.closest(
								'#__primerPortalRoot__, [role="dialog"], [data-target="get-repo.modal"], get-repo',
							) != null),
				);
			if (archiveList) return archiveList;

			const legacyLists = [...document.querySelectorAll<HTMLElement>('[data-target="get-repo.modal"] ul')];
			return legacyLists.find(list => list.closest('#local-panel') || list.querySelector('a[href*="/archive/"]'));
		}

		private getPullRequestActionList(owner: string, repo: string): HTMLElement | undefined {
			const localOptions = document.querySelector<HTMLElement>('ul[aria-label="Local checkout options"]');
			if (localOptions) return localOptions;
			const reactItem = document.querySelector<HTMLElement>(
				'#__primerPortalRoot__ .react-overview-code-button-action-list > ul > ul > li:first-child',
			);
			if (reactItem?.parentElement) return reactItem.parentElement;
			const legacy = document.querySelector<HTMLElement>('[data-target="get-repo.modal"] #local-panel ul');
			if (legacy) return legacy;
			const repoPrefix = `/${owner}/${repo}/`.toLowerCase();
			return [...document.querySelectorAll<HTMLElement>('[data-target="get-repo.modal"] ul')].find(list =>
				[...list.querySelectorAll<HTMLAnchorElement>('a[href]')].some(link =>
					(link.getAttribute('href') ?? '').toLowerCase().startsWith(repoPrefix),
				),
			);
		}

		private getCommitActionTarget(
			owner: string,
			repo: string,
		): { element: HTMLElement; position: InsertPosition; list: boolean } | undefined {
			const treePrefix = `/${owner}/${repo}/tree/`.toLowerCase();
			const browseFiles = [
				...document.querySelectorAll<HTMLAnchorElement>('a[data-component="Button"][href]'),
			].find(
				link =>
					link.getAttribute('href')?.toLowerCase().startsWith(treePrefix) &&
					link.textContent?.trim() === 'Browse files',
			);
			if (browseFiles) return { element: browseFiles, position: 'beforebegin', list: false };
			const legacy = document.querySelector<HTMLElement>(
				'#browse-at-time-link, [aria-label="Browse the repository at this point in the history"]',
			);
			return legacy ? { element: legacy, position: 'beforebegin', list: false } : undefined;
		}

		// insertAdjacentHTML puts beforebegin/afterend wrappers next to the target (in its parent), but afterbegin/beforeend inside of it
		private isPlaced(
			wrapper: HTMLElement,
			{ element, position }: { element: HTMLElement; position: InsertPosition },
		): boolean {
			switch (position) {
				case 'beforebegin':
					return wrapper.parentElement === element.parentElement && wrapper.nextElementSibling === element;
				case 'afterend':
					return wrapper.parentElement === element.parentElement && element.nextElementSibling === wrapper;
				default:
					return wrapper.parentElement === element;
			}
		}

		private upsertAction(
			target: HTMLElement | { element: HTMLElement; position: InsertPosition; list: boolean },
			slot: string,
			action: 'open' | 'compare',
			label: string,
			href: string,
		): void {
			const location =
				target instanceof HTMLElement
					? { element: target, position: 'beforeend' as InsertPosition, list: true }
					: target;
			const existing = [
				...document.querySelectorAll<HTMLElement>(`[data-gk-owner="github"][data-gk-slot="${slot}"]`),
			];
			let wrapper = existing.shift();
			for (const duplicate of existing) duplicate.remove();
			if (wrapper && (!this.isPlaced(wrapper, location) || wrapper.dataset.gkList !== String(location.list))) {
				wrapper.remove();
				wrapper = undefined;
			}

			const elementTag = location.list ? 'li' : 'a';
			if (!wrapper) {
				const html = location.list
					? `<li data-gk data-gk-owner="github" data-gk-action="${action}" data-gk-slot="${slot}" data-gk-list="true" data-component="ActionList.Item" data-has-description="false" style="list-style:none;margin:0 8px"><a class="gk-github-menu-link" data-component="Link" data-size="medium" href="${href}" target="_blank" title="${label}" aria-label="${label}" style="box-sizing:border-box;display:flex;align-items:center;width:100%;height:32px;padding:6px 8px;border-radius:6px;color:var(--fgColor-default,inherit);font-size:14px;line-height:20px;text-decoration:none"><span style="box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex:0 0 20px;width:20px;height:20px;margin-right:8px">${this.getGitKrakenSvg(
							16,
							undefined,
							'display:block;flex:0 0 auto;',
					  )}</span><span style="display:block;font-size:14px;line-height:20px">${label}</span></a></li>`
					: `<a data-gk data-gk-owner="github" data-gk-action="${action}" data-gk-slot="${slot}" data-gk-list="false" data-component="Button" data-size="small" class="gk-github-inline-action" href="${href}" target="_blank" title="${label}" aria-label="${label}" style="box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 8px;border:1px solid var(--button-default-borderColor,var(--borderColor-default,#d1d9e0));border-radius:6px;color:var(--button-default-fgColor,var(--fgColor-default,inherit));text-decoration:none;cursor:pointer">${this.getGitKrakenSvg(
							18,
							undefined,
							'display:block;flex:0 0 auto;',
					  )}<span class="sr-only">${label}</span></a>`;
				location.element.insertAdjacentHTML(location.position, html);
				wrapper = (
					location.position === 'beforebegin'
						? location.element.previousElementSibling
						: location.position === 'afterend'
						? location.element.nextElementSibling
						: location.position === 'afterbegin'
						? location.element.firstElementChild
						: location.element.lastElementChild
				) as HTMLElement;
			}
			wrapper.dataset.gkList = String(location.list);
			const link =
				elementTag === 'li' ? wrapper.querySelector<HTMLAnchorElement>('a') : (wrapper as HTMLAnchorElement);
			if (link && (link.href !== href || link.getAttribute('aria-label') !== label)) {
				link.href = href;
				link.setAttribute('aria-label', label);
				link.title = label;
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

		private getPullRequestBranches():
			| {
					head: { owner: string; repo: string; branch: string };
					base?: { owner: string; repo: string; branch: string };
			  }
			| undefined {
			// Path segments stay percent-encoded, like the tree/compare routes (decoding would turn `fix%23123` into a hash)
			const parseBranch = (link: HTMLAnchorElement | null | undefined) => {
				if (!link) return undefined;
				const parts = new URL(link.href, this.uri.origin).pathname.split('/').filter(Boolean);
				if (parts.indexOf('tree') !== 2 || !parts[0] || !parts[1] || !parts.slice(3).length) return undefined;
				return { owner: parts[0], repo: parts[1], branch: parts.slice(3).join('/') };
			};

			// The header renders `base` then `head` as sibling branch links (twice, with a sticky copy). The smallest
			// container holding two links is the real pair, unless the head is not a link (e.g. a deleted branch), in
			// which case the two links found are base copies with the same href
			const selector = 'a[data-component="BranchName"][href]';
			let container = document.querySelector<HTMLAnchorElement>(selector)?.parentElement;
			while (container && container !== document.body) {
				const links = container.querySelectorAll<HTMLAnchorElement>(selector);
				if (links.length >= 2) {
					if (links[0].href !== links[1].href) {
						const base = parseBranch(links[0]);
						const head = parseBranch(links[1]);
						if (base && head) return { base: base, head: head };
					}
					break;
				}
				container = container.parentElement;
			}

			// Classic markup (GitHub Enterprise Server)
			const head = parseBranch(document.querySelector<HTMLAnchorElement>('.commit-ref.head-ref a'));
			if (!head) return undefined;
			return {
				head: head,
				base: parseBranch(document.querySelector<HTMLAnchorElement>('.commit-ref.base-ref a')),
			};
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
					const branches = this.getPullRequestBranches();
					if (branches) {
						const { head } = branches;
						if (action === 'compare' && branches.base) {
							const baseBranch = `${branches.base.owner}/${branches.base.repo}:${branches.base.branch}`;
							const headBranch = `${head.owner}/${head.repo}:${head.branch}`;
							redirectUrl = new URL(
								`${target}://eamodio.gitlens/link/r/${repoId}/compare/${baseBranch}...${headBranch}`,
							);
						}
						if (redirectUrl === null) {
							redirectUrl = new URL(`${target}://eamodio.gitlens/link/r/${repoId}/b/${head.branch}`);
						}

						redirectUrl.searchParams.set('pr', prNumber);
						redirectUrl.searchParams.set('prUrl', this.uri.toString());

						if (head.owner !== owner || head.repo !== repo) {
							const prRepoUrl = new URL(this.uri.toString());
							prRepoUrl.hash = '';
							prRepoUrl.search = '';
							prRepoUrl.pathname = `/${owner}/${repo}.git`;
							redirectUrl.searchParams.set('prRepoUrl', prRepoUrl.toString());

							owner = head.owner;
							repo = head.repo;
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
