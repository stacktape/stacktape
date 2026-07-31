import { fsPaths } from 'src/config/runtime-paths';
import { exec } from '@utils/exec';
import { CliError } from '@utils/errors';

export const execPack = async ({
  args,
  cwd,
  onOutputLine
}: {
  args: string[];
  cwd: string;
  onOutputLine?: (line: string) => void;
}) => {
  return exec(fsPaths.packPath(), args, {
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
