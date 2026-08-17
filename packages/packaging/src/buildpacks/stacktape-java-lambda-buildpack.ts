import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { DEFAULT_JAVA_VERSION } from '../bundlers/constants';
import { buildJavaArtifact } from '../bundlers/java';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import type { JavaLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import { findJavaProjectRoots } from './project-root';

export const buildUsingStacktapeJavaLambdaBuildpack = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  zippedSizeLimit,
  languageSpecificConfig,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions & {
    zippedSizeLimit: number;
    languageSpecificConfig: JavaLanguageSpecificConfig;
  }): Promise<PackagingOutput> => {
  const useMaven =
    languageSpecificConfig?.useMaven ?? languageSpecificConfig?.packageManagerFile?.endsWith('pom.xml') ?? false;
  const { buildRoot: rootSourcePath } = findJavaProjectRoots({
    cwd,
    entryfilePath,
    useMaven,
    explicitProjectFile: languageSpecificConfig?.packageManagerFile
  });
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildJavaArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    javaVersion: languageSpecificConfig?.javaVersion ?? DEFAULT_JAVA_VERSION,
    useMaven,
    sourcePath: rootSourcePath,
    entryfilePath: absoluteEntryfilePath,
    name,
    progressLogger,
    rawEntryfilePath: absoluteEntryfilePath,
    cwd,
    languageSpecificConfig,
    target: 'lambda',
    // JNI dependencies packaged for Lambda must target glibc rather than Alpine/musl.
    requiresGlibcBinaries: true
  });

  if (outcome === 'skipped') {
    return { ...otherOutputProps, digest, outcome, size: null, jobName: name };
  }

  const { unzippedSize, zippedSize, artifactPath } = await createLambdaZipArtifact({
    name,
    distFolderPath,
    digest,
    sizeLimit,
    zippedSizeLimit,
    archiveItem: otherProps.archiveItem,
    createPackagingError: otherProps.createPackagingError,
    progressLogger
  });

  return {
    digest,
    outcome,
    zippedSize,
    size: unzippedSize,
    artifactPath,
    details: { ...otherOutputProps },
    sourceFiles: otherOutputProps.sourceFiles,
    jobName: name
  };
};
