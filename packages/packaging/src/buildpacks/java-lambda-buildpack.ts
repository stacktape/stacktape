import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { DEFAULT_JAVA_VERSION } from '../bundlers/constants';
import { buildJavaArtifact } from '../bundlers/java';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import type { JavaBuildpackConfig, SupportedJavaVersion } from '@stacktape/config/deployment-artifacts';
import { findJavaProjectRoots, usesMaven } from './project-root';

export const buildJavaLambda = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  java: languageSpecificConfig,
  javaVersion,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions & {
    java?: JavaBuildpackConfig | undefined;
    /** From the function's runtime; the buildpack default otherwise. */
    javaVersion?: SupportedJavaVersion | undefined;
  }): Promise<PackagingOutput> => {
  const useMaven =
    languageSpecificConfig?.useMaven ??
    languageSpecificConfig?.packageManagerFile?.endsWith('pom.xml') ??
    usesMaven({ cwd, entryfilePath });
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
    lambdaZip: true,
    javaVersion: javaVersion ?? DEFAULT_JAVA_VERSION,
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
