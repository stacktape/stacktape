const main = async () => {
  const { INVOKED_FROM_ENV_VAR_NAME } = await import('@config');
  const { getCliInput } = await import('@utils/cli');
  const { resolveOutputMode } = await import('@application-services/tui-manager/output-mode');
  const { runCommand } = await import('../../index');

  const { commands, options, additionalArgs } = getCliInput();
  const forceTty = process.env.FORCE_TTY === '1';
  const outputMode = resolveOutputMode({
    explicitMode: options.outputFormat,
    forceTty
  });
  const shouldRunInteractiveLauncher =
    !commands.length && !options.agent && outputMode === 'tty' && (process.stdin.isTTY || forceTty);

  if (shouldRunInteractiveLauncher) {
    const { runInteractiveLauncher } = await import('@application-services/tui-manager/interactive-launcher');
    const launcherResult = await runInteractiveLauncher();
    if (!launcherResult) {
      return;
    }
    return runCommand({
      args: {
        ...options,
        ...launcherResult.args
      },
      commands: [launcherResult.command],
      additionalArgs,
      invokedFrom: (process.env[INVOKED_FROM_ENV_VAR_NAME] as InvokedFrom) || 'cli'
    });
  }

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
