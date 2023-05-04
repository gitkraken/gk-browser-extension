export type LinkTarget = 'gitkraken' | 'gkdev' | 'vscode' | 'vscode-insiders';

export interface InjectionProvider {
	inject(): void;
}
