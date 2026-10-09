/**
 * The engine's shell-out seams, bound to the real binaries.
 *
 * Kept apart from the engine so `preflight.ts` imports nothing that spawns processes — the same
 * separation the railpack planner uses, and the reason both are testable without Docker installed.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDockerImage, checkDockerImageExists, execDocker, getDockerImageDetails } from '@utils/docker';
import { buildJsBundleImage } from '@stacktape/packaging/buildpacks/js-bundle-image';
import { resolveNodeVersion } from '@stacktape/packaging/bundlers/node-version';
import { buildUsingRailpack } from '@stacktape/packaging/image/railpack';
import { dependencyInstaller } from '@domain-services/packaging-manager/dependency-installer';
import { SOURCE_MAP_INSTALL_DIST_PATH } from 'src/config/project-paths';
import { createCliPackagingError } from '@domain-services/packaging-manager/errors';
import { runRailpackPrepare } from '@domain-services/packaging-manager/railpack-command';
import { RAILPACK_FRONTEND_IMAGE } from 'src/config/railpack';
import type { PreflightRunners } from './preflight';

/** The preflight build reports through its own boot observations, not through packaging events. */
const silentProgressLogger = { eventContext: {}, startEvent: () => {}, updateEvent: () => {}, finishEvent: () => {} };

export const createPreflightRunners = (): PreflightRunners => ({
  // `skipHandleError` keeps failures as plain rejections: the engine classifies them itself, and a
  // CliError with deploy-flavoured hints would be the wrong voice inside a dry run.
  docker: async (commands) => {
    const result = await execDocker(commands, { skipHandleError: true });
    return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  },
  // The same builder and inputs a deploy uses for `js-bundle`, with a scratch build directory of its own.
  jsBundle: async ({ repositoryRoot, imageName, entryfilePath, nodeVersion, requiresGlibcBinaries }) => {
    const workDirectory = await mkdtemp(join(tmpdir(), 'stacktape-preflight-'));
    try {
      await buildJsBundleImage({
        name: imageName,
        cwd: repositoryRoot,
        entryfilePath,
        existingDigests: [],
        invocationId: `preflight-${imageName}`,
        progressLogger: silentProgressLogger,
        buildDockerImage,
        // Native architecture only: a local dry run never cross-builds, so no platform needs preparing first.
        runDocker: execDocker,
        checkDockerImageExists,
        getDockerImageDetails,
        createPackagingError: createCliPackagingError,
        installDependencies: dependencyInstaller.install,
        nativeDependencyInstallationRootPath: join(workDirectory, '_bin-install'),
        sourceMapInstallPath: SOURCE_MAP_INSTALL_DIST_PATH,
        distFolderPath: join(workDirectory, 'dist'),
        additionalDigestInput: '',
        minify: true,
        nodeTarget: String(resolveNodeVersion({ nodeVersion, target: 'container' })),
        requiresGlibcBinaries
      });
    } finally {
      await rm(workDirectory, { recursive: true, force: true });
    }
  },
  buildpack: ({ sourceDirectory, imageName, startCommand, buildCommand }) =>
    buildUsingRailpack({
      name: imageName,
      cwd: sourceDirectory,
      sourceDirectoryPath: '.',
      ...(startCommand === undefined ? {} : { startCommand }),
      ...(buildCommand === undefined ? {} : { buildCommand }),
      progressLogger: silentProgressLogger,
      existingDigests: [],
      railpackFrontendImage: RAILPACK_FRONTEND_IMAGE,
      buildDockerImage,
      runRailpackPrepare,
      createPackagingError: createCliPackagingError
    })
});
