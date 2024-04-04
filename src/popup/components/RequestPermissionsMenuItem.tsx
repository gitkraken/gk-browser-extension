import React from 'react';
import { permissions, runtime } from 'webextension-polyfill';
import type { PermissionsRequest } from '../../permissions-helper';
import { PermissionsGrantedMessage } from '../../shared';

const sendPermissionsGranted = async () => {
	await runtime.sendMessage(PermissionsGrantedMessage);
};

export const RequestPermissionsMenuItem = ({ permissionsRequest }: { permissionsRequest: PermissionsRequest }) => {
	let buttonLabel;
	if (permissionsRequest.hasRequired) {
		buttonLabel = 'Allow required permissions to continue';
	} else {
		const typesRequested: string[] = [];
		if (permissionsRequest.hasCloud) {
			typesRequested.push('cloud');
		}
		if (permissionsRequest.hasEnterprise) {
			typesRequested.push('self-hosted');
		}

		buttonLabel = `Allow permissions for ${typesRequested.join(' & ')} git providers`;
	}

	return (
		<a
			className="alert"
			href="#"
			onClick={async () => {
				const granted = await permissions.request(permissionsRequest.request);
				if (granted) {
					await sendPermissionsGranted();
				}
			}}
		>
			{buttonLabel}
		</a>
	);
};
