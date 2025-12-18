import { localBuildTsConfigPath } from '@shared/utils/misc';
import { CONSOLE_APP_SERVER_DIST_PATH, SERVER_SOURCE_PATH } from '../shared/naming/project-fs-paths';
import { buildEsCode } from '../shared/packaging/bundlers/es';
import { logInfo, logPath, logSuccess } from '../shared/utils/logging';

export const buildServer = async () => {
  logInfo('Building server...');

  await buildEsCode({
    sourcePath: SERVER_SOURCE_PATH,
    distPath: CONSOLE_APP_SERVER_DIST_PATH,
    cwd: process.cwd(),
    tsConfigPath: localBuildTsConfigPath,
    nodeTarget: '24',
    keepNames: true,
    minify: true,
    outputModuleFormat: 'esm',
    sourceMapBannerType: 'pre-compiled',
    sourceMaps: 'inline',
    externals: ['esbuild']
  });
  logSuccess(`Server built successfully to: ${logPath(CONSOLE_APP_SERVER_DIST_PATH)}`);
};

if (import.meta.main) {
  buildServer();
}
