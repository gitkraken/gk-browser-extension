import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { storage } from 'webextension-polyfill';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24, // 24 hours
		},
	},
});

// This implements a persister for react-query that uses the browser extension's storage API
export const asyncStoragePersister = createAsyncStoragePersister({
	storage: {
		getItem: async key => {
			const data = await storage.session.get(key);
			return data[key] as string | null | undefined;
		},
		setItem: async (key, value) => {
			await storage.session.set({ [key]: value });
		},
		removeItem: async key => {
			await storage.session.remove(key);
		},
	},
});
