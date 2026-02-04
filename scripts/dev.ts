import { CLI_SOURCE_PATH, DEV_TMP_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { dynamicRequire } from '@shared/utils/fs-utils';
import { logError, logInfo, logWarn } from '@shared/utils/logging';
import packageJson from '../package.json';
import { packageHelperLambdas } from './package-helper-lambdas';
import { config } from 'dotenv';

if (!process.env.SKIP_LOADING_ENV) {
  config({ path: '.env.local' });
}

const buildSource = async () => {
  const result = await Bun.build({
    entrypoints: [CLI_SOURCE_PATH],
    outdir: DEV_TMP_FOLDER_PATH,
    target: 'bun',
    minify: false,
    sourcemap: 'inline',
    bytecode: false,
    define: {
      STACKTAPE_VERSION: `"${packageJson.version}"`
    }
  });
  if (!result.success) {
    throw new Error(`Failed to build source: ${result.logs.map((log) => log.message).join('\n')}`);
  }
  return result.outputs[0].path;
};

export const runDev = async () => {
  const [cliDistPath] = await Promise.all([
    buildSource(),
    packageHelperLambdas({ isDev: true, distFolderPath: DEV_TMP_FOLDER_PATH })
  ]);

  logInfo('----- RUN -----');
  try {
    process.env.STP_DEV_MODE = 'true';
    const { runUsingCli } = dynamicRequire({
      filePath: cliDistPath
    }) as typeof import('../src/api/cli');
    await runUsingCli();
    logInfo('----- FINISHED -----');
  } catch (err) {
    // if for some reason, the error doesn't get properly handled, print
    if (err.details === undefined) {
      logError(err, '- UNHANDLED ERROR -');
    }
    logWarn('----- FINISHED WITH ERROR -----');
  }
};

if (import.meta.main) {
  runDev();
}
