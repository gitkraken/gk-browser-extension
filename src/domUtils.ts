export const createAnchor = (href: string, target?: string, callback?: () => void) => {
	const a = document.createElement('a');
	a.href = href;
	if (target) {
		a.target = target;
	}
	if (callback) {
		a.addEventListener('click', callback);
	}

	return a;
};

export const createFAIcon = (faIcon: string) => {
	const icon = document.createElement('i');
	icon.classList.add('fa-regular', faIcon, 'icon');
	return icon;
};
