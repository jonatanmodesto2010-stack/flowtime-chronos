import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
export const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || 'dev';
export const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
export const FULL_VERSION = `${APP_VERSION}-${BUILD_VERSION}`;

export const APP_NAME = 'Sistema de Gestão ISP';
export const APP_YEAR = new Date().getFullYear();

export const getFullVersion = () => {
  return `v${APP_VERSION} (build ${BUILD_VERSION})`;
};

export const getVersionInfo = () => ({
  version: APP_VERSION,
  buildVersion: BUILD_VERSION,
  buildTime: BUILD_TIME,
  fullVersion: FULL_VERSION,
});
