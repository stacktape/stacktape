import { dirname, join } from 'node:path';
import { INVOKED_FROM_ENV_VAR_NAME } from '@config';
import { getCliInput } from '@utils/cli';
import { config as loadDotenv } from 'dotenv';
import { runCommand } from '../../index';

// Load environment variables from .env file
loadDotenv();

export const runUsingCli = async () => {
  const { commands, options, additionalArgs } = getCliInput();
  return runCommand({
    args: options,
    commands,
    additionalArgs,
    invokedFrom: (process.env[INVOKED_FROM_ENV_VAR_NAME] as InvokedFrom) || 'cli'
  });
};

const ESBUILD_BINARY = {
  win32: 'exec.exe',
  darwin: 'exec',
  linux: 'exec'
}[process.platform];

const newEsbuildBinPath = join(dirname(process.execPath), 'esbuild', ESBUILD_BINARY);

process.env.ESBUILD_BINARY_PATH = newEsbuildBinPath;

// Auto-run when executed as main module (for Bun compile)
if (import.meta.main) {
  // Set up esbuild binary path (required for bundling functionality)
  const ESBUILD_BINARY = {
    win32: 'exec.exe',
    darwin: 'exec',
    linux: 'exec'
  }[process.platform];

  const newEsbuildBinPath = join(dirname(process.execPath), 'esbuild', ESBUILD_BINARY);
  process.env.ESBUILD_BINARY_PATH = newEsbuildBinPath;

  runUsingCli().catch(() => {
    process.exit(1);
  });
}
