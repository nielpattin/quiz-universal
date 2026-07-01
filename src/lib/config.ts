import { PUBLIC_DEBUG } from '$env/static/public';

export const APP_VERSION = '2.4.0';
export const DEBUG = PUBLIC_DEBUG === 'true';

export const checkAppVersion = (): boolean => {
	const storedVersion = localStorage.getItem('app_version');
	return storedVersion === APP_VERSION;
};
