import { packagingMessages } from '../../runtime-contracts';
import type {
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger,
  RunDocker,
  StpBuildpackInput
} from '../../runtime-contracts';
import type { CreateBundleOutput } from '../../runtime-contracts';
import { buildJavaArtifactDockerfile } from '../../docker/dockerfiles';
import { remove } from 'fs-extra';
import { createTemporaryBuildFile } from '../../fs/temporary-file';
import objectHash from 'object-hash';
import { getBundleDigest, getSourceFiles } from './utils';
import type { JavaLanguageSpecificConfig, SupportedJavaVersion } from '@stacktape/config/deployment-artifacts';
import { DEFAULT_JAVA_VERSION } from '../constants';
import {
  applyArtifactFileSelection,
  assertRequiredArtifactFile,
  mergeExplicitlyIncludedSourceFiles,
  resolveArtifactFileSelection
} from '../../artifact/file-selection';
import { runDockerArtifactBuild } from '../../artifact/docker-artifact-build';
import { findNearestProjectRoot } from '../../buildpacks/project-root';
import { basename, relative } from 'node:path';
import { getMatchingFilesByGlob, transformToUnixPath } from '../../fs/files';

type LanguageBundleOutput = Omit<CreateBundleOutput, 'distIndexFilePath'> &
  Partial<Pick<CreateBundleOutput, 'distIndexFilePath'>>;

export const buildJavaArtifact = async ({
  sourcePath,
  distFolderPath,
  javaVersion = DEFAULT_JAVA_VERSION,
  useMaven = false,
  rawEntryfilePath,
  cwd: _cwd,
  additionalDigestInput,
  distIndexFilePath,
  progressLogger,
  existingDigests,
  languageSpecificConfig,
  dockerBuildOutputArchitecture,
  includeFiles,
  excludeFiles,
  target = 'container',
  createPackagingError,
  requiresGlibcBinaries,
  runDocker
}: StpBuildpackInput & {
  sourcePath: string;
  javaVersion?: SupportedJavaVersion | undefined;
  useMaven?: boolean | undefined;
  target?: 'container' | 'lambda' | undefined;
  rawEntryfilePath: string;
  distIndexFilePath?: string | undefined;
  progressLogger: ProgressLogger;
  languageSpecificConfig: JavaLanguageSpecificConfig;
  createPackagingError: CreatePackagingError;
  runDocker: RunDocker;
}): Promise<LanguageBundleOutput> => {
  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const artifactFileSelection = await resolveArtifactFileSelection({ cwd: _cwd, includeFiles });

  const digest = await getBundleDigest({
    externalDependencies: [],
    rootPath: sourcePath,
    additionalDigestInput: objectHash({
      additionalDigestInput,
      dockerBuildOutputArchitecture,
      includeFiles,
      excludeFiles,
      target,
      explicitlyIncludedFilesDigest: artifactFileSelection.digest
    }),
    languageSpecificConfig,
    rawEntryfilePath
  });
  const sourceFiles = mergeExplicitlyIncludedSourceFiles({
    cwd: _cwd,
    sourceFiles: await getSourceFiles({ rootPath: sourcePath }),
    explicitlyIncludedFiles: artifactFileSelection.explicitlyIncludedFiles
  });
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({
      eventType: 'CALCULATE_CHECKSUM',
      finalMessage: packagingMessages.unchanged
    });
    return {
      digest,
      outcome: 'skipped' as const,
      distFolderPath,
      ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
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
  const moduleRootPath = findNearestProjectRoot({
    cwd: sourcePath,
    entryfilePath: rawEntryfilePath,
    markerFiles: useMaven ? ['pom.xml'] : ['build.gradle', 'build.gradle.kts']
  });
  const modulePath = transformToUnixPath(relative(sourcePath, moduleRootPath)) || '.';
  const temporaryInitScript = useMaven
    ? undefined
    : await createTemporaryBuildFile({
        contents: gradleInitFileContent,
        directoryPath: sourcePath,
        prefix: 'stp-init-',
        suffix: '.gradle'
      });
  const dockerfileContents = buildJavaArtifactDockerfile({
    javaVersion,
    useMaven,
    alpine: !requiresGlibcBinaries,
    initScriptFileName: temporaryInitScript?.fileName,
    modulePath,
    target
  });

  let buildResult: { succeeded: true } | { succeeded: false; error: unknown };
  try {
    await runDockerArtifactBuild({
      dockerfileContents,
      sourcePath,
      distFolderPath,
      dockerBuildOutputArchitecture,
      runDocker
    });
    buildResult = { succeeded: true };
  } catch (error) {
    buildResult = { succeeded: false, error };
  }
  if (temporaryInitScript) {
    try {
      await remove(temporaryInitScript.filePath);
    } catch (cleanupError) {
      if (buildResult.succeeded) {
        throw cleanupError;
      }
    }
  }
  if ('error' in buildResult) {
    throw buildResult.error;
  }
  await applyArtifactFileSelection({
    cwd: _cwd,
    outputDirectory: distFolderPath,
    includeFiles,
    excludeFiles,
    explicitlyIncludedFiles: artifactFileSelection.explicitlyIncludedFiles,
    createPackagingError
  });
  const entryClassName = basename(rawEntryfilePath).replace(/\.java$/, '.class');
  const normalizedEntrypoint = transformToUnixPath(rawEntryfilePath);
  const conventionalSourceMarker = '/src/main/java/';
  const conventionalSourceIndex = normalizedEntrypoint.lastIndexOf(conventionalSourceMarker);
  if (conventionalSourceIndex >= 0) {
    await assertRequiredArtifactFile({
      outputDirectory: distFolderPath,
      relativePath: normalizedEntrypoint
        .slice(conventionalSourceIndex + conventionalSourceMarker.length)
        .replace(/\.java$/, '.class'),
      description: 'Java entry class',
      createPackagingError
    });
  } else if (
    (await getMatchingFilesByGlob({ globPattern: [`**/${entryClassName}`], cwd: distFolderPath })).length === 0
  ) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `The packaged artifact is missing its required Java entry class: ${entryClassName}.`,
      hint: 'Check entryfilePath, the selected Maven/Gradle module, and excludeFiles.'
    });
  }
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return {
    ...(distIndexFilePath !== undefined ? { distIndexFilePath } : {}),
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
const gradleInitFileContent = `gradle.projectsEvaluated {
  def requestedDir = new File(rootProject.projectDir, gradle.startParameter.projectProperties['stacktapeTargetDir']).canonicalFile
  def targetProject = rootProject.allprojects.find { it.projectDir.canonicalFile == requestedDir }
  if (targetProject == null) {
    throw new GradleException("Stacktape could not find Gradle project at " + requestedDir)
  }
  rootProject.tasks.register('stacktapeDist', Copy) {
    dependsOn targetProject.tasks.named('classes')
    from targetProject.sourceSets.main.output
    into('lib') {
      from targetProject.configurations.runtimeClasspath
    }
    into rootProject.file('dist')
  }
}
`;
