// First: the source CLI's paths must not depend on the current directory.
import { CLI_SOURCE_ROOT } from './support/cli-source-root';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { CLI_SOURCE_PATH, DEV_TMP_FOLDER_PATH } from 'src/config/project-paths';
import { dynamicRequire } from '@utils/fs-utils';
import { logError, logInfo, logWarn } from '@scripts/support/logging';
import { localBuildTsConfigPath } from '@utils/misc';
import { createFsExtraSingleCopyPlugin } from '@scripts/support/fs-extra-single-copy-plugin';
import { createStacktapeOpenTuiBuildPlugin } from '@scripts/support/opentui-loader';
import packageJson from '../package.json';
import { config } from 'dotenv';
import { setTimeout as sleep } from 'node:timers/promises';

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
  process.argv.includes('--json') ||
  hasArgValue({ flag: '--output-format', value: 'jsonl' }) ||
  hasArgValue({ flag: '--outputFormat', value: 'jsonl' }) ||
  hasArgValue({ flag: '--ofmt', value: 'jsonl' });
const isMachineMode =
  process.argv.includes('--agent') ||
  process.argv.includes('--agentPort') ||
  process.argv.includes('-ap') ||
  requestedJsonlOutput;
const isMcpMode = process.argv.includes('mcp');
const devBuildLockPath = `${DEV_TMP_FOLDER_PATH}.lock`;
// Test suites that spawn the CLI many times build it once without this flag, then reuse that bundle. Nothing
// checks that the bundle matches the sources, so it is never read outside such an owned sequence.
const reuseDevBuild = process.env.STP_DEV_REUSE_BUILD === '1';
const devBuildOutputPath = join(DEV_TMP_FOLDER_PATH, basename(CLI_SOURCE_PATH).replace(/\.ts$/, '.js'));
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
  // Quiet: dotenv's banner on standard output broke the MCP server's protocol stream.
  config({ path: join(CLI_SOURCE_ROOT, '.env.local'), quiet: true });
}

/**
 * Builds the dev CLI bundle, which then runs in this process. The OpenTUI plugin compiles TSX with Babel, and Babel
 * replaces `Error.prepareStackTrace` process-wide with a wrapper that rejects anything but an error. mysql2 calls
 * `Error.captureStackTrace` on a plain object for every connection and query, so each MySQL call of the dev agent
 * failed with "First argument must be an Error object". The release CLI never loads Babel; restoring both globals
 * makes this process match it.
 */
export const buildSource = async ({ outdir = DEV_TMP_FOLDER_PATH }: { outdir?: string } = {}) => {
  const { prepareStackTrace, stackTraceLimit } = Error;
  try {
    return await bundleCli(outdir);
  } finally {
    Error.prepareStackTrace = prepareStackTrace;
    Error.stackTraceLimit = stackTraceLimit;
  }
};

const bundleCli = async (outdir: string) => {
  const openTuiBuildPlugin = createStacktapeOpenTuiBuildPlugin();
  const result = await Bun.build({
    entrypoints: [CLI_SOURCE_PATH],
    outdir,
    target: 'bun',
    minify: false,
    sourcemap: 'inline',
    bytecode: false,
    plugins: [openTuiBuildPlugin, createFsExtraSingleCopyPlugin()],
    // @opentui/core dynamically imports a native package per platform (@opentui/core-darwin-x64, etc.).
    // Only the current platform's package is installed, so externalize them all — the matching one
    // resolves from node_modules at runtime, the rest are never imported.
    // web-tree-sitter: @opentui/core imports the 0.25 wasm path while the hoisted package moved to
    // 0.26's layout mid-migration; externalizing keeps the dev bundle building (the parser only
    // loads for TUI syntax highlighting).
    external: ['follow-redirects', '@opentui/core-*', 'web-tree-sitter', 'web-tree-sitter/*'],
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
    if (process.env.STACKTAPE_INIT_MCP === '1') {
      // Run straight from source, like MCP mode below: rebuilding the whole CLI for a child process
      // the agent spawns per session would add seconds to every run for no benefit.
      const { runInitMcpServer } = await import('../src/init/mcp/bin');
      await runInitMcpServer();
      return;
    }
    if (isMcpMode) {
      const { commandMcp } = await import('../src/commands/mcp');
      await commandMcp();
      return;
    }

    const cliDistPath =
      reuseDevBuild && existsSync(devBuildOutputPath)
        ? devBuildOutputPath
        : await withDevBuildLock(() => buildSource());

    if (!isSilentMode) {
      logInfo('----- RUN -----');
    }

    const { runUsingCli } = dynamicRequire({
      filePath: cliDistPath
    }) as typeof import('../src/entrypoints/cli');
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
