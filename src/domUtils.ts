export const createAnchor = (href: string, target?: string, onclick?: () => void) => {
	const a = document.createElement('a');
	a.href = href;
	if (target) {
		a.target = target;
	}
	if (onclick) {
		a.addEventListener('click', onclick);
	}

	return a;
};

export const createFAIcon = (faIcon: string) => {
	const icon = document.createElement('i');
	icon.classList.add('fa-regular', faIcon, 'icon');
	return icon;
};
