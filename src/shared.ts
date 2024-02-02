import { action } from 'webextension-polyfill';

const IconPaths = {
  Grey: {
    16: '/icons/gk-grey-16.png',
    32: '/icons/gk-grey-32.png',
    48: '/icons/gk-grey-48.png',
    128: '/icons/gk-grey-128.png',
  },
  Green: {
    16: '/icons/gk-green-16.png',
    32: '/icons/gk-green-32.png',
    48: '/icons/gk-green-48.png',
    128: '/icons/gk-green-128.png',
  },
};

export const updateExtensionIcon = (isLoggedIn: boolean) => action.setIcon({ path: isLoggedIn ? IconPaths.Green : IconPaths.Grey });
