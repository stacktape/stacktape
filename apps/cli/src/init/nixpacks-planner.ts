/**
 * The container builder as an oracle for the scan.
 *
 * `nixpacks plan` runs the exact provider analysis `nixpacks build` runs later — no Docker, no
 * network, a subprocess reading files. So for a service nothing else could answer, its planned
 * start command is not a guess about what the container will do; it is what the container will do.
 * The scan asks, and the answer becomes the suggestion on the `command-unknown` card.
 *
 * Failure here is always an absent answer, never a failed scan: a missing binary, a directory the
 * planner cannot make sense of, or output that does not parse all return `null`, and the pipeline
 * behaves exactly as it did before this oracle existed.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execNixpacks } from '@domain-services/packaging-manager/nixpacks-command';
import { fsPaths } from 'src/config/runtime-paths';
import type { CommandPlanner } from '@stacktape/config-inference/scan/conventions';

/** Nothing a plan suggests should be longer than a command line a person would review. */
const MAX_COMMAND_LENGTH = 300;

/** Pull the planned start command out of `nixpacks plan --format json` output, defensively. */
export const parsePlannedStartCommand = (stdout: string): string | null => {
  try {
    const parsed = JSON.parse(stdout) as { start?: { cmd?: unknown } } | null;
    const cmd = parsed?.start?.cmd;
    if (typeof cmd !== 'string') return null;
    const trimmed = cmd.trim();
    return trimmed.length > 0 && trimmed.length <= MAX_COMMAND_LENGTH ? trimmed : null;
  } catch {
    return null;
  }
};

export const createNixpacksPlanner = (repositoryRoot: string): CommandPlanner => ({
  planStart: async (serviceRelativePath) => {
    // The binary ships with the CLI but is not guaranteed in every development checkout.
    if (!existsSync(fsPaths.nixpacksPath())) return null;
    try {
      const result = await execNixpacks({
        args: ['plan', '.', '--format', 'json'],
        cwd: serviceRelativePath === '.' ? repositoryRoot : join(repositoryRoot, serviceRelativePath)
      });
      return parsePlannedStartCommand(result.stdout);
    } catch {
      return null;
    }
  }
});
