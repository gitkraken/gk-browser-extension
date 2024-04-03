import React from 'react';
import type { User } from '../types';
import { SignedIn } from './SignedIn';
import { SignedOut } from './SignedOut';

export const Popup = ({ user }: { user: User | null }) => {
	if (user) {
		return <SignedIn user={user} />;
	}

	return <SignedOut />;
};
