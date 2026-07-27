import { isAbsolute, join } from 'node:path';
import { getFolder } from '@shared/utils/fs-utils';
import { DEFAULT_PHP_VERSION } from './bundlers/constants';
import { buildPhpArtifact } from './bundlers/php';
import { createLambdaZipArtifact } from './lambda-artifact';

export const buildUsingStacktapePhpLambdaBuildpack = async ({
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
  languageSpecificConfig?: PhpLanguageSpecificConfig;
}): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const absoluteSourcePath = isAbsolute(sourcePath) ? sourcePath : join(cwd, sourcePath);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildPhpArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    sourcePath: absoluteSourcePath,
    phpVersion: languageSpecificConfig?.phpVersion ?? DEFAULT_PHP_VERSION,
    entryfilePath: absoluteEntryfilePath,
    rawEntryfilePath: absoluteEntryfilePath,
    name,
    progressLogger,
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
