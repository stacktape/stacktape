import { fsPaths } from '@shared/naming/fs-paths';
import { exec } from './exec';
import { getError } from './misc';

export const execPack = async ({ args, cwd }: { args: string[]; cwd: string }) => {
  return exec(fsPaths.packPath(), args, { cwd, disableStdout: true, disableStderr: true }).catch((err) => {
    throw getError({
      type: 'PACK',
      message: `Failed to execute pack command '${args.join(' ')}' in directory ${cwd}:\n${err.message}`
    });
  });
};
