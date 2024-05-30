import React from 'react';
import { permissions, runtime } from 'webextension-polyfill';
import type { PermissionsRequest } from '../../permissions-helper';
import { PermissionsGrantedMessage } from '../../shared';

const sendPermissionsGranted = async () => {
	await runtime.sendMessage(PermissionsGrantedMessage);
};

export const RequestPermissionsBanner = ({ permissionsRequest }: { permissionsRequest: PermissionsRequest }) => {
	let buttonLabel;
	if (permissionsRequest.hasRequired) {
		buttonLabel = 'This extension requires additional permissions.';
	} else {
		const typesRequested: string[] = [];
		if (permissionsRequest.hasCloud) {
			typesRequested.push('cloud');
		}
		if (permissionsRequest.hasEnterprise) {
			typesRequested.push('self-hosted');
		}

		buttonLabel = `Allow permissions for ${typesRequested.join(' & ')} git providers.`;
	}

	return (
		<div className="alert text-lg bold">
			{buttonLabel}{' '}
			<a
				className="text-link"
				href="#"
				onClick={async () => {
					const granted = await permissions.request(permissionsRequest.request);
					if (granted) {
						await sendPermissionsGranted();
						window.close();
					}
				}}
			>
				Request Permissions
			</a>
		</div>
	);
};
