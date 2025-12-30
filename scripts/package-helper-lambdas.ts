import { join } from 'node:path';
import {
  CLI_BUILD_DIST_FOLDER_PATH,
  HELPER_LAMBDAS_DIST_FOLDER_PATH,
  HELPER_LAMBDAS_FOLDER_NAME,
  HELPER_LAMBDAS_SOURCE_FOLDER_PATH
} from '@shared/naming/project-fs-paths';
import { buildUsingStacktapeEsLambdaBuildpack } from '@shared/packaging/stacktape-es-lambda-buildpack';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { localBuildTsConfigPath } from '@shared/utils/misc';
import fsExtra, { remove } from 'fs-extra';

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

  await fsExtra.ensureDir(HELPER_LAMBDAS_DIST_FOLDER_PATH);

  const lambdasDistFolderPath = join(distFolderPath, HELPER_LAMBDAS_FOLDER_NAME);
  await fsExtra.ensureDir(lambdasDistFolderPath);

  await Promise.all(
    Object.entries(helperLambdas).map(async ([name, { filePath, bundleSizeLimit }]) => {
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
        isDev: false,
        externals: ['aws-sdk'],
        distFolderPath: join(lambdasDistFolderPath, name),
        progressLogger: {
          startEvent: () => {},
          finishEvent: () => {},
          updateEvent: () => {},
          get eventContext() {
            return {};
          }
        },
        args: {},
        zippedSizeLimit: Infinity,
        invocationId: 'helper-lambdas-install'
      });
      await remove(join(lambdasDistFolderPath, name));
    })
  );
  logSuccess('Helper lambdas packaged successfully.');
};

if (import.meta.main) {
  packageHelperLambdas({ isDev: false, distFolderPath: CLI_BUILD_DIST_FOLDER_PATH });
}
