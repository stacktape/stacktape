import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { exec } from '@utils/exec';
import { describeToolDownload } from '@utils/external-tools';
import { fsPaths } from 'src/config/runtime-paths';

export const execNixpacks = async ({ args, cwd }: { args: string[]; cwd: string }) => {
  // Resolved first: a failed first-use download explains itself instead of reading as a failed nixpacks command.
  const nixpacksPath = await fsPaths.nixpacksPath({
    onDownloadStart: (details) => tuiManager.info(describeToolDownload(details))
  });
  return exec(nixpacksPath, args, { cwd, disableStdout: true, disableStderr: true }).catch((err) => {
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
