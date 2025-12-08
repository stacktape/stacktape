import { existsSync } from 'node:fs';
import { fsPaths } from '@shared/naming/fs-paths';

if (existsSync(fsPaths.esbuildBinaryPath())) {
  process.env.ESBUILD_BINARY_PATH = fsPaths.esbuildBinaryPath();
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
