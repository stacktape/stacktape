import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { buildRubyArtifact } from '../bundlers/ruby';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import type { SupportedRubyVersion } from '@stacktape/config/deployment-artifacts';
import { findNearestProjectRoot, getEntryPathInArtifact } from './project-root';

type RubyLambdaLocation = { cwd: string; entryfilePath: string };

/** The directory that becomes the ZIP root: the nearest one with a Gemfile, or the entry file's without one. */
const resolveRubyLambdaRoot = ({ cwd, entryfilePath }: RubyLambdaLocation) =>
  findNearestProjectRoot({ cwd, entryfilePath, markerFiles: ['Gemfile', 'gems.rb'] });

/**
 * The file Lambda loads the handler from: the entry file's path inside the ZIP, without `.rb`. With a Gemfile at the
 * project root, `src/handler.rb` is `src/handler`; beside its Gemfile it is `handler`.
 */
export const getRubyLambdaHandlerFile = (location: RubyLambdaLocation) =>
  getEntryPathInArtifact({ ...location, artifactRoot: resolveRubyLambdaRoot(location) });

export const buildRubyLambda = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  rubyVersion,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions & {
    /**
     * The version of the function's Lambda runtime, the one the template deploys. There is no default here: a default
     * of its own let the build use another version than the runtime, and native dependencies then failed to load.
     */
    rubyVersion: SupportedRubyVersion;
  }): Promise<PackagingOutput> => {
  const absoluteSourcePath = resolveRubyLambdaRoot({ cwd, entryfilePath });
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildRubyArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    lambdaZip: true,
    sourcePath: absoluteSourcePath,
    rubyVersion,
    entryfilePath: absoluteEntryfilePath,
    rawEntryfilePath: absoluteEntryfilePath,
    name,
    progressLogger,
    cwd,
    target: 'lambda',
    // Managed Lambda runtimes are glibc-based. Alpine-built native gems are not ABI-compatible.
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
