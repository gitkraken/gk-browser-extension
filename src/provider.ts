export type LinkTarget = 'gitkraken' | 'gkdev' | 'vscode' | 'vscode-insiders' | 'client';

export interface InjectionProvider {
	inject(): void;
}
