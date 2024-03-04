export type LinkTarget = 'vscode' | 'vscode-insiders';

export interface InjectionProvider {
	inject(): void;
}
