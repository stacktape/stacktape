import { join } from 'node:path';
import {
  DIST_FOLDER_PATH,
  CLI_BUILD_DIST_FOLDER_PATH,
  HELPER_LAMBDAS_DIST_FOLDER_PATH,
  HELPER_LAMBDAS_FOLDER_NAME,
  HELPER_LAMBDAS_SOURCE_FOLDER_PATH,
  SOURCE_MAP_INSTALL_DIST_PATH
} from '@shared/naming/project-fs-paths';
import { buildUsingStacktapeEsLambdaBuildpack } from '@stacktape/packaging/buildpacks/stacktape-es-lambda-buildpack';
import { dependencyInstaller } from '@shared/utils/dependency-installer';
import { execDocker } from '@shared/utils/docker';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { getError, localBuildTsConfigPath } from '@shared/utils/misc';
import { archiveItem } from '@shared/utils/zip';
import fsExtra, { remove } from 'fs-extra';
import { generateSourceMapInstall } from './release/build-cli-sources';

const helperLambdas = {
  stacktapeServiceLambda: {
    filePath: join(HELPER_LAMBDAS_SOURCE_FOLDER_PATH, 'stacktapeServiceLambda/index.ts'),
    bundleSizeLimit: 35
  },
  batchJobTriggerLambda: {
    filePath: join(HELPER_LAMBDAS_SOURCE_FOLDER_PATH, 'batchJobTriggerLambda/index.ts'),
    bundleSizeLimit: 3.35
  },
  cdnOriginRequestLambda: {
    filePath: join(HELPER_LAMBDAS_SOURCE_FOLDER_PATH, 'cdnOriginRequestLambda/index.ts'),
    bundleSizeLimit: 3.35
  },
  cdnOriginResponseLambda: {
    filePath: join(HELPER_LAMBDAS_SOURCE_FOLDER_PATH, 'cdnOriginResponseLambda/index.ts'),
    bundleSizeLimit: 3.35
  }
};

export const packageHelperLambdas = async ({ distFolderPath }: { isDev?: boolean; distFolderPath: string }) => {
  logInfo('Packaging helper lambdas...');
  const packagingRunId = `helper-lambdas-install-${process.pid}-${Date.now().toString(36)}`;

  await generateSourceMapInstall({ distFolderPath: DIST_FOLDER_PATH });

  await fsExtra.ensureDir(HELPER_LAMBDAS_DIST_FOLDER_PATH);

  const lambdasDistFolderPath = join(distFolderPath, HELPER_LAMBDAS_FOLDER_NAME);
  await fsExtra.ensureDir(lambdasDistFolderPath);

  for (const [name, { filePath, bundleSizeLimit }] of Object.entries(helperLambdas)) {
    await buildUsingStacktapeEsLambdaBuildpack({
      existingDigests: [],
      sizeLimit: bundleSizeLimit,
      includeFiles: [],
      name,
      cwd: process.cwd(),
      entryfilePath: filePath,
      languageSpecificConfig: {
        tsConfigPath: localBuildTsConfigPath
      },
      nodeTarget: '22',
      minify: true,
      externals: ['aws-sdk'],
      distFolderPath: join(lambdasDistFolderPath, name),
      progressLogger: {
        startEvent: () => {},
        finishEvent: () => {},
        updateEvent: () => {},
        get eventContext() {
          return { instanceId: name };
        }
      },
      archiveItem,
      createPackagingError: getError,
      installDependencies: dependencyInstaller.install,
      nativeDependencyInstallationRootPath: join(lambdasDistFolderPath, '_bin-install'),
      runDocker: execDocker,
      sourceMapInstallPath: SOURCE_MAP_INSTALL_DIST_PATH,
      zippedSizeLimit: Infinity,
      invocationId: `${packagingRunId}-${name}`
    });
    await remove(join(lambdasDistFolderPath, name));
  }

  logSuccess('Helper lambdas packaged successfully.');
};

if (import.meta.main) {
  packageHelperLambdas({ isDev: false, distFolderPath: CLI_BUILD_DIST_FOLDER_PATH });
}
