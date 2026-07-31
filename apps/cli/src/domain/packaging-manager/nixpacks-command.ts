import { fsPaths } from 'src/config/runtime-paths';
import { exec } from '@utils/exec';
import { CliError } from '@utils/errors';

export const execNixpacks = async ({ args, cwd }: { args: string[]; cwd: string }) => {
  return exec(fsPaths.nixpacksPath(), args, { cwd, disableStdout: true, disableStderr: true }).catch((err) => {
    throw new CliError({
      category: 'NIXPACKS',
      code: 'NIXPACKS_COMMAND_FAILED',
      message: `Failed to execute nixpacks command \`${args.join(' ')}\` in \`${cwd}\`:\n${err.message}`,
      hints:
        'If the auto-detected build configuration is incorrect, adjust it manually: https://docs.stacktape.com/configuration/packaging/#external-buildpack',
      cause: err
    });
  });
};
