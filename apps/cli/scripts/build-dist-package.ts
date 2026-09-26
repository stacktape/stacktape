import type { SupportedPlatform } from '@utils/platform';
import { join } from 'node:path';
import { DIST_PACKAGE_FOLDER_PATH } from 'src/config/project-paths';
import { getPlatform } from '@utils/bin-executable';
import { exec } from '@utils/exec';
import { logInfo, logSuccess } from '@scripts/support/logging';
import { archiveItem } from '@utils/zip';
import { readdir, remove, stat } from 'fs-extra';
import yargsParser from 'yargs-parser';
import { generateStarterProjectsMetadata } from './generate-starter-projects-metadata';
import { packageHelperLambdas } from './package-helper-lambdas';
import { getCliArgs } from './release/args';
import {
  buildBinaryFile,
  copyConfigSchema,
  copyInitWizardBundle,
  copyMcpDocs,
  copySessionsManagerPluginBinary,
  createReleaseDataFile,
  EXECUTABLE_FILE_PATTERNS,
  generateSourceMapInstall,
  generateLambdaTracingRuntime
} from './release/build-cli-sources';

const recursivelyChmodPlusX = async (directoryPath: string) => {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        await recursivelyChmodPlusX(fullPath);
      } else if (entry.isFile()) {
        const stats = await stat(fullPath);
        if (!(stats.mode & 0o111)) {
          await exec('chmod', ['+x', fullPath], {});
        }
      }
    })
  );
};

/**
 * Builds `platform`'s release archive into `distFolderPath`, which it empties first. `bytecodeDepth` overrides the
 * platform's release bytecode, for `release/qualify-bytecode.ts` only.
 */
export const buildDistPackage = async ({
  platform,
  version,
  debug,
  keepUnarchived,
  distFolderPath = DIST_PACKAGE_FOLDER_PATH,
  bytecodeDepth
}: {
  platform: SupportedPlatform;
  version: string;
  debug?: boolean;
  keepUnarchived?: boolean;
  distFolderPath?: string;
  bytecodeDepth?: number | 'off';
}) => {
  logInfo(`Building binary for platform: ${platform}, version: ${version}`);

  await remove(distFolderPath);

  const platformDistFolderPath = await buildBinaryFile({
    distFolderPath,
    platform,
    debug,
    version,
    bytecodeDepth
  });

  await Promise.all([
    copySessionsManagerPluginBinary({ distFolderPath, platform }),
    copyConfigSchema({ distFolderPath: platformDistFolderPath }),
    copyInitWizardBundle({ distFolderPath: platformDistFolderPath }),
    copyMcpDocs({ distFolderPath: platformDistFolderPath }),
    generateStarterProjectsMetadata({ distFolderPath: platformDistFolderPath }),
    packageHelperLambdas({ distFolderPath: platformDistFolderPath }),
    createReleaseDataFile({ distFolderPath: platformDistFolderPath, version }),
    generateSourceMapInstall({ distFolderPath: platformDistFolderPath }),
    generateLambdaTracingRuntime({ distFolderPath: platformDistFolderPath })
  ]);

  if (platform !== 'win') {
    await recursivelyChmodPlusX(platformDistFolderPath);
  }

  const archivePath = await archiveItem({
    absoluteSourcePath: platformDistFolderPath,
    format: platform === 'win' ? 'zip' : 'tgz',
    executablePatterns: EXECUTABLE_FILE_PATTERNS,
    useNativeZip: platform === 'win' // Native zip for Windows archives
  });

  if (!keepUnarchived) {
    logInfo('Cleaning up temporary files...');
    await Promise.all([remove(platformDistFolderPath), remove(join(platformDistFolderPath, 'downloaded'))]);
    logSuccess('Temporary files cleaned up successfully.');
  }

  logSuccess(`Binary for platform ${platform} built successfully: ${archivePath}`);
  return { archivePath, platformDistFolderPath };
};

if (import.meta.main) {
  const argv = yargsParser(process.argv.slice(2));
  const platform = (argv.platform as SupportedPlatform) || getPlatform();
  const version = (argv.version as string) || 'dev';

  if (!platform || !version) {
    throw new Error('Platform and version are required. Usage: --platform <platform> --version <version>');
  }
  const { debug, keepUnarchived } = getCliArgs();
  buildDistPackage({ platform, version, debug, keepUnarchived });
}
