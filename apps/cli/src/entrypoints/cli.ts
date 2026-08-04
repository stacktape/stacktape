// OpenTUI checks this process-wide flag when its modules initialize. Set it
// before dynamically loading either the CLI application or interactive launcher.
process.env.OTUI_USE_CONSOLE = 'false';

const main = async () => {
  const { configureNativeRuntimeForPlatform } = await import('@utils/bin-executable');
  configureNativeRuntimeForPlatform();

  const { getCliInput } = await import('@utils/cli');
  const { resolveOutputMode } = await import('@application-services/tui-manager/output/mode');
  const { runCommand } = await import('../index');

  const { commands, options, additionalArgs } = getCliInput();
  const forceTty = process.env.FORCE_TTY === '1';
  const outputMode = resolveOutputMode({
    explicitMode: options.outputFormat,
    forceTty
  });
  const shouldRunInteractiveLauncher =
    !commands.length && !options.agent && outputMode === 'tty' && (process.stdin.isTTY || forceTty);

  if (shouldRunInteractiveLauncher) {
    const { runInteractiveLauncher } = await import('@application-services/tui-manager/launcher');
    const launcherResult = await runInteractiveLauncher();
    if (!launcherResult) {
      return;
    }
    const mergedArgs = { ...options, ...launcherResult.args };
    // Echo the equivalent non-interactive command so it lands in shell history
    // and teaches the flag form.
    const { formatCommandLine } = await import('@application-services/tui-manager/launcher/data');
    process.stdout.write(`\n→ ${formatCommandLine(launcherResult.command, mergedArgs)}\n\n`);
    return runCommand({
      args: mergedArgs,
      commands: [launcherResult.command],
      additionalArgs
    });
  }

  return runCommand({
    args: options,
    commands,
    additionalArgs
  });
};

export const runUsingCli = main;

if (import.meta.main) {
  main().catch(() => {
    process.exit(1);
  });
}
