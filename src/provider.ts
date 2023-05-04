export type LinkTarget = 'gitkraken' | 'gkdev' | 'vscode' | 'vscode-insiders';

export interface RenderConfig {
	location: 'before' | 'after';
	selector: string;
	additionalClasses?: string[];
}

export interface InjectionProvider {
	inject(): void;
}
