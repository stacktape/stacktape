import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Set up esbuild binary path BEFORE any other imports
// This must happen before esbuild module is loaded because esbuild checks
// ESBUILD_BINARY_PATH during module initialization to locate its native binary.
// When bundled with Bun, the normal resolution logic fails.
const ESBUILD_BINARY = {
  win32: 'exec.exe',
  darwin: 'exec',
  linux: 'exec'
}[process.platform];

const esbuildBinPath = join(dirname(process.execPath), 'esbuild', ESBUILD_BINARY);

// Only set if the binary exists at the expected location (for bundled binary distribution)
// This allows development mode to use node_modules esbuild
if (existsSync(esbuildBinPath)) {
  process.env.ESBUILD_BINARY_PATH = esbuildBinPath;
}

const main = async () => {
  const { INVOKED_FROM_ENV_VAR_NAME } = await import('@config');
  const { getCliInput } = await import('@utils/cli');
  const { runCommand } = await import('../../index');

  const { commands, options, additionalArgs } = getCliInput();
  return runCommand({
    args: options,
    commands,
    additionalArgs,
    invokedFrom: (process.env[INVOKED_FROM_ENV_VAR_NAME] as InvokedFrom) || 'cli'
  });
};

export const runUsingCli = main;

if (import.meta.main) {
  main().catch(() => {
    process.exit(1);
  });
}
