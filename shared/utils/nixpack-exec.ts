import { dirname, join } from 'node:path';
import { IS_DEV } from '@config';
import { SCRIPTS_ASSETS_PATH } from '@shared/naming/project-fs-paths';
import { getPlatform } from './bin-executable';
import { NIXPACKS_BINARY_FILE_NAMES } from './constants';
import { exec } from './exec';
import { getError } from './misc';

const packPath = IS_DEV
  ? join(SCRIPTS_ASSETS_PATH, 'nixpacks', NIXPACKS_BINARY_FILE_NAMES[getPlatform()])
  : join(dirname(process.execPath), 'nixpacks', getPlatform() === 'win' ? 'nixpacks.exe' : 'nixpacks');

export const execNixpacks = async ({ args, cwd }: { args: string[]; cwd: string }) => {
  return exec(packPath, args, { cwd, disableStdout: true, disableStderr: true }).catch((err) => {
    throw getError({
      type: 'NIXPACKS',
      message: `Failed to execute nixpacks command '${args.join(' ')}' in directory ${cwd}:\n${err.message}`,
      hint: 'If the auto-detected nixpacks build configuration is not correct, you can adjust it manually. To learn more, refer to https://docs.stacktape.com/configuration/packaging/#external-buildpack'
    });
  });
};

// if (checkExecutableInPath('pack')) {
//   try {
//     const packResult = await exec('pack', args, {
//       cwd,
// disableStdout: true,
// disableStderr: true
//     });
//     output = packResult.stdout;
//   } catch (err) {
//     throw buildError(err);
//   }
// } else {
//   const command = [
//     'run',
//     '-v',
//     '/var/run/docker.sock:/var/run/docker.sock',
//     '-v',
//     `${cwd}:/workspace`,
//     '--user',
//     'root',
//     `buildpacksio/pack:${version || '0.22.0'}`,
//     ...args
//   ];
//   let stderr;
//   try {
//     ({ stderr } = await execDocker(command));
//   } catch (err) {
//     throw buildError(err);
//   }
//   output = stderr;
// }
// return output;
