import type { InjectionProvider } from '../provider';

export function injectionScope(url: string) {
	class GitLabInjectionProvider implements InjectionProvider {
		constructor(private readonly uri: URL) {}

		inject(): void {
			this.render();
		}

		private render() {}
	}

	const provider = new GitLabInjectionProvider(new URL(url));
	provider.inject();
}
