import { build } from 'esbuild';
import { copy } from 'fs-extra';
import {
  CONFIG_CONVERTER_DIST_PATH,
  CONFIG_CONVERTER_SOURCE_PATH,
  CONSOLE_APP_CONFIG_CONVERTER_DIST_PATH
} from '../shared/naming/project-fs-paths';
import { logInfo, logPath, logSuccess } from '../shared/utils/logging';

export const buildConfigConverter = async () => {
  logInfo('Building config converter...');

  await build({
    entryPoints: [CONFIG_CONVERTER_SOURCE_PATH],
    outfile: CONFIG_CONVERTER_DIST_PATH,
    target: 'es2020',
    format: 'esm',
    minify: false,
    bundle: true,
    keepNames: true,
    sourcemap: 'inline'
  });

  logSuccess(`Config converter built successfully to: ${logPath(CONFIG_CONVERTER_DIST_PATH)}`);

  logInfo('Copying config converter to console app...');
  await copy(CONFIG_CONVERTER_DIST_PATH, CONSOLE_APP_CONFIG_CONVERTER_DIST_PATH);
  logSuccess(
    `Config converter copied to console app successfully to: ${logPath(CONSOLE_APP_CONFIG_CONVERTER_DIST_PATH)}`
  );
};

if (import.meta.main) {
  buildConfigConverter();
}
