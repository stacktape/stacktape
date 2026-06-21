import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { CLI_SOURCE_PATH, DEV_TMP_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { dynamicRequire } from '@shared/utils/fs-utils';
import { logError, logInfo, logWarn } from '@shared/utils/logging';
import { localBuildTsConfigPath } from '@shared/utils/misc';
import { createStacktapeOpenTuiBuildPlugin } from '@shared/utils/stacktape-opentui';
import packageJson from '../package.json';
import { packageHelperLambdas } from './package-helper-lambdas';
import { config } from 'dotenv';
import { setTimeout as sleep } from 'node:timers/promises';

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
const devBuildLockPath = `${DEV_TMP_FOLDER_PATH}.lock`;
const devBuildLockStaleAfterMs = 10 * 60 * 1000;

const drainStream = async (stream: NodeJS.WriteStream) => {
  if (stream.writableLength === 0) {
    return;
  }
  await new Promise<void>((resolve) => {
    stream.once('drain', resolve);
    setTimeout(resolve, 300);
  });
};

const finishProcess = async () => {
  await Promise.all([drainStream(process.stdout), drainStream(process.stderr)]);
  process.exit(process.exitCode ?? 0);
};

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unhandled Stacktape dev wrapper error.';
};

const tryAcquireDevBuildLock = async () => {
  try {
    await mkdir(devBuildLockPath, { recursive: false });
    await writeFile(
      `${devBuildLockPath}/owner.json`,
      JSON.stringify({
        pid: process.pid,
        createdAt: Date.now()
      })
    );
    return true;
  } catch (err: any) {
    if (err?.code !== 'EEXIST') {
      throw err;
    }

    try {
      const lockInfo = JSON.parse(await readFile(`${devBuildLockPath}/owner.json`, 'utf8'));
      if (Date.now() - Number(lockInfo.createdAt) > devBuildLockStaleAfterMs) {
        await rm(devBuildLockPath, { recursive: true, force: true });
      }
    } catch {
      await rm(devBuildLockPath, { recursive: true, force: true });
    }
    return false;
  }
};

const withDevBuildLock = async <T>(fn: () => Promise<T>) => {
  while (!(await tryAcquireDevBuildLock())) {
    await sleep(250);
  }

  try {
    return await fn();
  } finally {
    await rm(devBuildLockPath, { recursive: true, force: true });
  }
};

const writeMachineError = (err: unknown) => {
  const message = getErrorMessage(err);
  process.stdout.write(
    `${JSON.stringify({
      type: 'log',
      ts: new Date().toISOString(),
      level: 'error',
      source: 'dev-wrapper',
      message
    })}\n`
  );
  process.stdout.write(
    `${JSON.stringify({
      type: 'result',
      ts: new Date().toISOString(),
      ok: false,
      code: 'DEV_WRAPPER_ERROR',
      message,
      data: {}
    })}\n`
  );
};

if (isMachineMode || isMcpMode) {
  process.env.STP_SILENT_SCRIPT_LOGS = 'true';
}

if (!skipLoadingEnv) {
  config({ path: '.env.local' });
}

const buildSource = async () => {
  const openTuiBuildPlugin = createStacktapeOpenTuiBuildPlugin();
  const result = await Bun.build({
    entrypoints: [CLI_SOURCE_PATH],
    outdir: DEV_TMP_FOLDER_PATH,
    target: 'bun',
    minify: false,
    sourcemap: 'inline',
    bytecode: false,
    plugins: [openTuiBuildPlugin],
    // @opentui/core dynamically imports a native package per platform (@opentui/core-darwin-x64, etc.).
    // Only the current platform's package is installed, so externalize them all — the matching one
    // resolves from node_modules at runtime, the rest are never imported.
    external: ['follow-redirects', '@opentui/core-*'],
    tsconfig: localBuildTsConfigPath,
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
  const isSilentMode = isMachineMode || isMcpMode;

  try {
    process.env.STP_DEV_MODE = 'true';
    if (isMcpMode) {
      const { commandMcp } = await import('../src/commands/mcp');
      await commandMcp();
      return;
    }

    const cliDistPath = await withDevBuildLock(async () => {
      const [cliDistPath] = await Promise.all([
        buildSource(),
        !skipPackagingHelperLambdas && packageHelperLambdas({ isDev: true, distFolderPath: DEV_TMP_FOLDER_PATH })
      ]);
      return cliDistPath;
    });

    if (!isSilentMode) {
      logInfo('----- RUN -----');
    }

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
      if (isSilentMode) {
        writeMachineError(err);
      } else {
        logError(err, '- UNHANDLED ERROR -');
      }
    }
    process.exitCode = 1;
    if (!isSilentMode) {
      logWarn('----- FINISHED WITH ERROR -----');
    }
  }
};

if (import.meta.main) {
  runDev().finally(async () => {
    if (process.env.STP_DEBUG_ACTIVE_HANDLES === '1') {
      const activeResources = (process as any).getActiveResourcesInfo?.() || [];
      const activeHandles = ((process as any)._getActiveHandles?.() || []).map(
        (h: any) => h?.constructor?.name || 'Unknown'
      );
      const activeRequests = ((process as any)._getActiveRequests?.() || []).map(
        (r: any) => r?.constructor?.name || 'Unknown'
      );
      process.stderr.write(`[DEV EXIT DEBUG] active resources: ${JSON.stringify(activeResources)}\n`);
      process.stderr.write(`[DEV EXIT DEBUG] active handles: ${JSON.stringify(activeHandles)}\n`);
      process.stderr.write(`[DEV EXIT DEBUG] active requests: ${JSON.stringify(activeRequests)}\n`);
    }

    await finishProcess();
  });
}
