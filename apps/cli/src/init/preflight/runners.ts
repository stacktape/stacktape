/**
 * The engine's shell-out seams, bound to the real binaries.
 *
 * Kept apart from the engine so `preflight.ts` imports nothing that spawns processes — the same
 * separation the railpack planner uses, and the reason both are testable without Docker installed.
 */

import { buildDockerImage, execDocker } from '@utils/docker';
import { buildUsingRailpack } from '@stacktape/packaging/image/railpack';
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
