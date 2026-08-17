/**
 * The engine's shell-out seams, bound to the real binaries.
 *
 * Kept apart from the engine so `preflight.ts` imports nothing that spawns processes — the same
 * separation the nixpacks planner uses, and the reason both are testable without Docker installed.
 */

import { execDocker } from '@utils/docker';
import { execNixpacks } from '@domain-services/packaging-manager/nixpacks-command';
import type { PreflightRunners } from './preflight';

export const createPreflightRunners = (): PreflightRunners => ({
  // `skipHandleError` keeps failures as plain rejections: the engine classifies them itself, and a
  // CliError with deploy-flavoured hints would be the wrong voice inside a dry run.
  docker: async (commands) => {
    const result = await execDocker(commands, { skipHandleError: true });
    return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  },
  nixpacks: (args) => execNixpacks(args)
});
