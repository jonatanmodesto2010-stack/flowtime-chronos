import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
export const APP_NAME = 'Sistema de Gestão ISP';
export const APP_YEAR = new Date().getFullYear();

export const getFullVersion = () => {
  return `v${APP_VERSION} - ${APP_YEAR}`;
};
