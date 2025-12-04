import { join } from 'node:path';
import { DIST_PACKAGE_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { getPlatform } from '@shared/utils/bin-executable';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { archiveItem } from '@shared/utils/zip';
import { remove } from 'fs-extra';
import yargsParser from 'yargs-parser';
import { generateStarterProjectsMetadata } from './generate-starter-projects-metadata';
import { packageHelperLambdas } from './package-helper-lambdas';
import { getCliArgs } from './release/args';
import {
  buildBinaryFile,
  buildEsbuildRegister,
  copyConfigSchema,
  copyEsbuildBinary,
  copyNixpacksBinary,
  copyPackBinary,
  copySessionsManagerPluginBinary,
  createReleaseDataFile,
  EXECUTABLE_FILE_PATTERNS,
  generateSourceMapInstall
} from './release/build-cli-sources';

const { debug, keepUnarchived } = getCliArgs();

const buildEverything = async () => {
  const argv = yargsParser(process.argv.slice(2));
  const platform = (argv.platform as SupportedPlatform) || getPlatform();
  const version = (argv.version as string) || 'dev';

  if (!platform || !version) {
    throw new Error('Platform and version are required. Usage: --platform <platform> --version <version>');
  }

  logInfo(`Building binary for platform: ${platform}, version: ${version}`);

  const distFolderPath = DIST_PACKAGE_FOLDER_PATH;
  await remove(distFolderPath);

  const platformDistFolderPath = await buildBinaryFile({
    distFolderPath,
    platform,
    debug,
    version
  });

  // i (21:43:01:586) Copying esbuild-register...
  // i (21:43:01:587) Copying config schema...
  // i (21:43:01:588) Generating starter projects metadata...
  // i (21:43:01:588) Packaging helper lambdas...
  // i (21:43:01:589) Creating release data file...
  // i (21:43:01:589) Generating source map install file...

  await Promise.all([
    copyPackBinary({ distFolderPath, platform }),
    copyNixpacksBinary({ distFolderPath, platform }),
    copySessionsManagerPluginBinary({ distFolderPath, platform }),
    copyEsbuildBinary({ distFolderPath, platform }),
    buildEsbuildRegister({ distFolderPath: platformDistFolderPath }),
    copyConfigSchema({ distFolderPath: platformDistFolderPath }),
    generateStarterProjectsMetadata({ distFolderPath: platformDistFolderPath }),
    packageHelperLambdas({ isDev: false, distFolderPath: platformDistFolderPath }),
    createReleaseDataFile({ distFolderPath: platformDistFolderPath, version }),
    generateSourceMapInstall({ distFolderPath: platformDistFolderPath })
  ]);
  // await copyLegalComments({ distFolderPath: platformDistFolderPath });

  // Archive the binary
  const archivePath = await archiveItem({
    absoluteSourcePath: platformDistFolderPath,
    format: platform === 'win' ? 'zip' : 'tgz',
    executablePatterns: EXECUTABLE_FILE_PATTERNS
  });

  if (!keepUnarchived) {
    logInfo('Cleaning up temporary files...');
    await Promise.all([remove(platformDistFolderPath), remove(join(platformDistFolderPath, 'downloaded'))]);
    logSuccess('Temporary files cleaned up successfully.');
  }

  logSuccess(`Binary for platform ${platform} built successfully: ${archivePath}`);
};

if (import.meta.main) {
  buildEverything();
}
