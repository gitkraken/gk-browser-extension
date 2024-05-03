// Note: This code runs every time the extension popup is opened.

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { checkin, postEvent } from '../gkApi';
import { Popup } from './components/Popup';
import { asyncStoragePersister, queryClient } from './queryClient';

function main() {
	const mainEl = document.getElementById('popup-container')!;
	const root = createRoot(mainEl);
	root.render(
		<PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
			<Popup />
		</PersistQueryClientProvider>,
	);

	void postEvent('browserExtensionPopupOpened');
	void checkin();
}

main();
