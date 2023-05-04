import type { InjectionProvider } from '../provider';

export function injectionScope(url: string) {
	class BitbucketInjectionProvider implements InjectionProvider {
		constructor(private readonly uri: URL) {}

		inject(): void {
			this.render();
		}

		private render() {}
	}

	const provider = new BitbucketInjectionProvider(new URL(url));
	provider.inject();
}
