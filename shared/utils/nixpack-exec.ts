import { fsPaths } from '@shared/naming/fs-paths';
import { exec } from './exec';
import { getError } from './misc';

export const execNixpacks = async ({ args, cwd }: { args: string[]; cwd: string }) => {
  return exec(fsPaths.nixpacksPath(), args, { cwd, disableStdout: true, disableStderr: true }).catch((err) => {
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
