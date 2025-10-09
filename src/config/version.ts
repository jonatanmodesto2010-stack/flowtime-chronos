import packageJson from '../../package.json';

// Versão semântica do package.json (manual)
export const APP_VERSION = packageJson.version;
export const APP_NAME = 'Sistema de Gestão ISP';
export const APP_YEAR = new Date().getFullYear();

// Build version (automática) - gerada no build time
export const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || 'dev';
export const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

// Versão completa (ex: "0.0.0-20251009143000")
export const FULL_VERSION = `${APP_VERSION}-${BUILD_VERSION}`;

export const getFullVersion = () => {
  return `v${APP_VERSION} - ${APP_YEAR}`;
};

export const getBuildVersion = () => {
  return BUILD_VERSION;
};

export const getVersionInfo = () => ({
  version: APP_VERSION,
  buildVersion: BUILD_VERSION,
  buildTime: BUILD_TIME,
  fullVersion: FULL_VERSION,
});
