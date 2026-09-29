import { packagingMessages } from '../../runtime-contracts';
import type {
  CreatePackagingError,
  PackagingProgressLogger as ProgressLogger,
  RunDocker,
  StpBuildpackInput
} from '../../runtime-contracts';
import type { CreateBundleOutput } from '../../runtime-contracts';
import objectHash from 'object-hash';
import { buildRustArtifactDockerfile, CARGO_LAMBDA_IMAGE } from '../../docker/dockerfiles';
import { getBundleDigest, getSourceFiles } from './utils';
import {
  applyArtifactFileSelection,
  assertRequiredArtifactFile,
  mergeExplicitlyIncludedSourceFiles,
  resolveArtifactFileSelection
} from '../../artifact/file-selection';
import { runDockerArtifactBuild } from '../../artifact/docker-artifact-build';

type LanguageBundleOutput = Omit<CreateBundleOutput, 'distIndexFilePath'>;

/**
 * Builds a Rust Lambda `bootstrap` with cargo-lambda inside Docker. The architecture is decided by the function, not
 * by the Docker platform: the build runs on the host's native platform and cross-compiles, so it never emulates.
 */
export const buildRustArtifact = async ({
  sourcePath,
  packageName,
  binaryName,
  distFolderPath,
  cwd,
  additionalDigestInput,
  lambdaZip,
  progressLogger,
  existingDigests,
  rawEntryfilePath,
  dockerBuildOutputArchitecture,
  includeFiles,
  excludeFiles,
  createPackagingError,
  runDocker
}: StpBuildpackInput & {
  sourcePath: string;
  packageName: string;
  binaryName: string;
  progressLogger: ProgressLogger;
  rawEntryfilePath: string;
  createPackagingError: CreatePackagingError;
  runDocker: RunDocker;
}): Promise<LanguageBundleOutput> => {
  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const architecture = dockerBuildOutputArchitecture === 'linux/arm64' ? 'arm64' : 'x86_64';
  const artifactFileSelection = await resolveArtifactFileSelection({ cwd, includeFiles, lambdaZip });
  const digest = await getBundleDigest({
    lambdaZip,
    rootPath: sourcePath,
    additionalDigestInput: objectHash({
      additionalDigestInput,
      architecture,
      packageName,
      binaryName,
      cargoLambdaImage: CARGO_LAMBDA_IMAGE,
      includeFiles,
      excludeFiles,
      explicitlyIncludedFilesDigest: artifactFileSelection.digest
    }),
    rawEntryfilePath
  });
  const sourceFiles = mergeExplicitlyIncludedSourceFiles({
    cwd,
    sourceFiles: await getSourceFiles({ rootPath: sourcePath }),
    explicitlyIncludedFiles: artifactFileSelection.explicitlyIncludedFiles
  });
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM', finalMessage: packagingMessages.unchanged });
    return { digest, outcome: 'skipped', distFolderPath, sourceFiles, languageSpecificBundleOutput: {} };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({ eventType: 'BUILD_CODE', description: 'Building code' });
  await runDockerArtifactBuild({
    dockerfileContents: buildRustArtifactDockerfile({ packageName, binaryName, architecture }),
    sourcePath,
    distFolderPath,
    runDocker
  });
  await applyArtifactFileSelection({
    cwd,
    outputDirectory: distFolderPath,
    includeFiles,
    excludeFiles,
    explicitlyIncludedFiles: artifactFileSelection.explicitlyIncludedFiles,
    createPackagingError
  });
  await assertRequiredArtifactFile({
    outputDirectory: distFolderPath,
    relativePath: 'bootstrap',
    description: 'Rust bootstrap executable',
    createPackagingError
  });
  await progressLogger.finishEvent({ eventType: 'BUILD_CODE' });

  return { distFolderPath, digest, outcome: 'bundled', sourceFiles, languageSpecificBundleOutput: {} };
};
