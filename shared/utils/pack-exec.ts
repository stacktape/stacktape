import { fsPaths } from '@shared/naming/fs-paths';
import { exec } from './exec';
import { getError } from './misc';

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
    throw getError({
      type: 'PACK',
      message: `Failed to execute pack command '${args.join(' ')}' in directory ${cwd}:\n${err.message}`
    });
  });
};
