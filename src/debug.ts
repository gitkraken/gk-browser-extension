declare const MODE: 'production' | 'development' | 'none';

export const debug = (...args: any[]) => {
	if (MODE === 'development') {
		console.log(new Date().toLocaleTimeString(), ...args);
	}
};
