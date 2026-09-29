import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { buildRustArtifact } from '../bundlers/rust';
import { resolveRustCrate } from '../bundlers/rust/utils';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';

export const buildRustLambda = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  cwd,
  ...otherProps
}: StpBuildpackInput & LambdaArtifactActions): Promise<PackagingOutput> => {
  let crate: ReturnType<typeof resolveRustCrate>;
  try {
    crate = resolveRustCrate({ cwd, entryfilePath });
  } catch (error) {
    throw otherProps.createPackagingError({
      type: 'PACKAGING',
      message: error instanceof Error ? error.message : String(error),
      hint: 'Point entryfilePath at the binary source file of a crate, for example src/main.rs, next to or below its Cargo.toml.'
    });
  }
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildRustArtifact({
    ...otherProps,
    lambdaZip: true,
    sourcePath: crate.buildRoot,
    binaryName: crate.binaryName,
    progressLogger,
    name,
    entryfilePath: absoluteEntryfilePath,
    rawEntryfilePath: absoluteEntryfilePath,
    cwd
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
    details: { ...otherOutputProps, binaryName: crate.binaryName },
    sourceFiles: otherOutputProps.sourceFiles,
    jobName: name
  };
};
