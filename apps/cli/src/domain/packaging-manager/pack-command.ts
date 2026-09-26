import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { exec } from '@utils/exec';
import { describeToolDownload } from '@utils/external-tools';
import { fsPaths } from 'src/config/runtime-paths';

export const execPack = async ({
  args,
  cwd,
  onOutputLine
}: {
  args: string[];
  cwd: string;
  onOutputLine?: (line: string) => void;
}) => {
  // Resolved first: a failed first-use download explains itself instead of reading as a failed pack command.
  const packPath = await fsPaths.packPath({
    onDownloadStart: (details) => tuiManager.info(describeToolDownload(details))
  });
  return exec(packPath, args, {
    cwd,
    disableStdout: !onOutputLine,
    disableStderr: !onOutputLine,
    onOutputLine: onOutputLine ? (line) => onOutputLine(line) : undefined
  }).catch((err) => {
    throw new CliError({
      category: 'PACK',
      code: 'PACK_COMMAND_FAILED',
      message: `Failed to execute pack command \`${args.join(' ')}\` in \`${cwd}\`:\n${err.message}`,
      cause: err
    });
  });
};
