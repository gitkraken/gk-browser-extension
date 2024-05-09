import React from 'react';
import { tabs } from 'webextension-polyfill';

type ExternalLinkProps = {
	children: React.ReactNode;
	className?: string;
	href?: string;
	onClick?: () => any;
	title?: string;
};

export const ExternalLink = ({ children, className, href, onClick, title }: ExternalLinkProps) => {
	return (
		<a
			className={className}
			href={href}
			rel="noreferrer noopener"
			target="_blank"
			title={title}
			onClick={async e => {
				// Opening external links in Firefox will not cause the popup to automatically close,
				// so we must manually close it.

				// Closing the popup window before the link has finished opening will cause Firefox to open
				// the link in a new window instead of in a new tab. In order to prevent this, we manually
				// open the link in a new tab and await that, then close the popup window afterwards.
				e.preventDefault();

				if (onClick) {
					await onClick();
				}
				if (href) {
					await tabs.create({ url: href });
				}

				window.close();
			}}
		>
			{children}
		</a>
	);
};
