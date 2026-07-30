import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { getFolder } from '../fs/files';
import { DEFAULT_RUBY_VERSION } from '../bundlers/constants';
import { buildRubyArtifact } from '../bundlers/ruby';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import type { RubyLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';

export const buildUsingStacktapeRbLambdaBuildpack = async ({
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
    languageSpecificConfig?: RubyLanguageSpecificConfig | undefined;
  }): Promise<PackagingOutput> => {
  const sourcePath = getFolder(entryfilePath);
  const absoluteSourcePath = isAbsolute(sourcePath) ? sourcePath : join(cwd, sourcePath);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildRubyArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    sourcePath: absoluteSourcePath,
    rubyVersion: languageSpecificConfig?.rubyVersion ?? DEFAULT_RUBY_VERSION,
    entryfilePath: absoluteEntryfilePath,
    rawEntryfilePath: absoluteEntryfilePath,
    name,
    progressLogger,
    cwd,
    languageSpecificConfig
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
