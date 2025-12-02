import { dirname, join } from 'node:path';
import { IS_DEV } from '@config';
import { SCRIPTS_ASSETS_PATH } from '@shared/naming/project-fs-paths';
import { getPlatform } from './bin-executable';
import { SESSION_MANAGER_PLUGIN_BINARY_FILE_NAMES } from './constants';
// import { exec } from './exec';
// import { getError } from './misc';

export const sessionManagerPath = IS_DEV
  ? join(SCRIPTS_ASSETS_PATH, 'session-manager-plugin', SESSION_MANAGER_PLUGIN_BINARY_FILE_NAMES[getPlatform()])
  : join(dirname(process.execPath), 'session-manager-plugin', getPlatform() === 'win' ? 'smp.exe' : 'smp');

// export const sessionManagerExec = async ({ args, cwd = process.cwd() }: { args: string[]; cwd?: string }) => {
//   return exec(sessionManagerPath, args, { cwd, disableStdout: true, disableStderr: true }).catch((err) => {
//     throw getError({
//       type: 'SESSION_MANAGER',
//       message: `Failed to execute session-manager-plugin '${args.join(' ')}' in directory ${cwd}:\n${err.message}`
//     });
//   });
// };
