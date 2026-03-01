import { CLI_SOURCE_PATH, DEV_TMP_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { dynamicRequire } from '@shared/utils/fs-utils';
import { logError, logInfo, logWarn } from '@shared/utils/logging';
import packageJson from '../package.json';
import { packageHelperLambdas } from './package-helper-lambdas';
import { config } from 'dotenv';

const skipPackagingHelperLambdas = Boolean(process.env.SPHL);
const skipLoadingEnv = Boolean(process.env.SKIP_LOADING_ENV);
const hasArgValue = ({ flag, value }: { flag: string; value: string }) => {
  const args = process.argv;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === `${flag}=${value}`) return true;
    if (arg === flag && args[i + 1] === value) return true;
  }
  return false;
};

const requestedJsonlOutput =
  hasArgValue({ flag: '--outputFormat', value: 'jsonl' }) || hasArgValue({ flag: '--ofmt', value: 'jsonl' });
const isMachineMode =
  process.argv.includes('--agent') ||
  process.argv.includes('--agentPort') ||
  process.argv.includes('-ap') ||
  requestedJsonlOutput;
const isMcpMode = process.argv.includes('mcp');

if (isMachineMode || isMcpMode) {
  process.env.STP_SILENT_SCRIPT_LOGS = 'true';
}

if (!skipLoadingEnv) {
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
    !skipPackagingHelperLambdas && packageHelperLambdas({ isDev: true, distFolderPath: DEV_TMP_FOLDER_PATH })
  ]);

  const isSilentMode = isMachineMode || isMcpMode;
  if (!isSilentMode) {
    logInfo('----- RUN -----');
  }
  try {
    process.env.STP_DEV_MODE = 'true';
    const { runUsingCli } = dynamicRequire({
      filePath: cliDistPath
    }) as typeof import('../src/api/cli');
    await runUsingCli();
    if (!isSilentMode) {
      logInfo('----- FINISHED -----');
    }
  } catch (err) {
    // if for some reason, the error doesn't get properly handled, print
    if (err.details === undefined) {
      logError(err, '- UNHANDLED ERROR -');
    }
    process.exitCode = 1;
    if (!isSilentMode) {
      logWarn('----- FINISHED WITH ERROR -----');
    }
  }
};

if (import.meta.main) {
  runDev().finally(() => {
    if (process.env.STP_DEBUG_ACTIVE_HANDLES === '1') {
      const activeResources = (process as any).getActiveResourcesInfo?.() || [];
      const activeHandles = ((process as any)._getActiveHandles?.() || []).map(
        (h: any) => h?.constructor?.name || 'Unknown'
      );
      const activeRequests = ((process as any)._getActiveRequests?.() || []).map(
        (r: any) => r?.constructor?.name || 'Unknown'
      );
      logWarn(`[DEV EXIT DEBUG] active resources: ${JSON.stringify(activeResources)}`);
      logWarn(`[DEV EXIT DEBUG] active handles: ${JSON.stringify(activeHandles)}`);
      logWarn(`[DEV EXIT DEBUG] active requests: ${JSON.stringify(activeRequests)}`);
    }
  });
}
