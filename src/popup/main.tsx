// Note: This code runs every time the extension popup is opened.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './components/Popup';

function main() {
	const mainEl = document.getElementById('popup-container')!;
	const root = createRoot(mainEl);
	root.render(<Popup />);
}

main();
