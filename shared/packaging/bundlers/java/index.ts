import { join } from 'node:path';
import { execDocker } from '@shared/utils/docker';
import { buildJavaArtifactDockerfile } from '@shared/utils/dockerfiles';
import { transformToUnixPath } from '@shared/utils/fs-utils';
import { outputFile, remove } from 'fs-extra';
import objectHash from 'object-hash';
import { getBundleDigest, getSourceFiles } from './utils';

export const buildJavaArtifact = async ({
  sourcePath,
  distFolderPath,
  javaVersion,
  useMaven,
  rawEntryfilePath,
  cwd: _cwd,
  additionalDigestInput,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
  requiresGlibcBinaries
}: StpBuildpackInput & {
  sourcePath: string;
  javaVersion?: SupportedJavaVersion;
  useMaven?: boolean;
  rawEntryfilePath: string;
  distIndexFilePath?: string;
  progressLogger: ProgressLogger;
  languageSpecificConfig: JavaLanguageSpecificConfig;
}): Promise<CreateBundleOutput> => {
  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });

  const digest = await getBundleDigest({
    externalDependencies: [],
    rootPath: sourcePath,
    additionalDigestInput: objectHash({ additionalDigestInput, dockerBuildOutputArchitecture }),
    languageSpecificConfig,
    rawEntryfilePath
  });
  const sourceFiles = await getSourceFiles({ rootPath: sourcePath });
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({
      eventType: 'CALCULATE_CHECKSUM',
      finalMessage: 'Same artifact is already deployed, skipping.'
    });
    return {
      digest,
      outcome: 'skipped' as const,
      distFolderPath,
      distIndexFilePath,
      sourceFiles,
      languageSpecificBundleOutput: {
        java: {
          useMaven,
          javaVersion
        }
      }
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  const dockerfileContents = buildJavaArtifactDockerfile({
    javaVersion,
    useMaven,
    alpine: !requiresGlibcBinaries
  });
  const dockerfilePath = join(distFolderPath, 'Dockerfile');
  const stpInitGradlePath = join(sourcePath, 'stp-init.gradle');

  await Promise.all([
    outputFile(stpInitGradlePath, gradleInitFileContent),
    outputFile(dockerfilePath, dockerfileContents)
  ]);
  await execDocker(
    [
      'image',
      'build',
      ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
      '--target',
      'artifact',
      '--file',
      dockerfilePath,
      '--output',
      `type=local,dest=${transformToUnixPath(distFolderPath)}`,
      sourcePath
    ],
    { cwd: process.cwd() }
  );
  await remove(stpInitGradlePath);
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return {
    distIndexFilePath,
    distFolderPath,
    digest,
    outcome: 'bundled' as const,
    sourceFiles,
    languageSpecificBundleOutput: {
      java: {
        useMaven,
        javaVersion
      }
    }
  };
};

// init.gradle file used for gradle task definition used for building deployment artifact
const gradleInitFileContent = `allprojects {
  apply plugin: 'java'
  task stacktapeDist(type: Copy) {
    from compileJava
    from processResources
    into('lib') {
        from configurations.runtimeClasspath
    }
    into "dist"
  }
}
`;
