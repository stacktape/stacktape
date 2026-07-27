import { isAbsolute, join } from 'node:path';
import { getFolder } from '@shared/utils/fs-utils';
import { DEFAULT_JAVA_VERSION } from './bundlers/constants';
import { buildJavaArtifact } from './bundlers/java';
import { createLambdaZipArtifact } from './lambda-artifact';

export const buildUsingStacktapeJavaLambdaBuildpack = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  zippedSizeLimit,
  languageSpecificConfig,
  cwd,
  ...otherProps
}: StpBuildpackInput & {
  zippedSizeLimit: number;
  languageSpecificConfig: JavaLanguageSpecificConfig;
}): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const absoluteSourcePath = isAbsolute(sourcePath) ? sourcePath : join(cwd, sourcePath);
  const rootSourceIndex = absoluteSourcePath.search(/src(\/|\\)main(\/|\\)java/);
  const rootSourcePath = rootSourceIndex === -1 ? absoluteSourcePath : absoluteSourcePath.slice(0, rootSourceIndex);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildJavaArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    javaVersion: languageSpecificConfig?.javaVersion ?? DEFAULT_JAVA_VERSION,
    sourcePath: rootSourcePath,
    entryfilePath: absoluteEntryfilePath,
    name,
    progressLogger,
    rawEntryfilePath: absoluteEntryfilePath,
    cwd,
    languageSpecificConfig
  });

  if (outcome === 'skipped') {
    return { ...otherOutputProps, digest, outcome, size: null, jobName: name } as PackagingOutput;
  }

  const { unzippedSize, zippedSize, artifactPath } = await createLambdaZipArtifact({
    name,
    distFolderPath,
    digest,
    sizeLimit,
    zippedSizeLimit,
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
